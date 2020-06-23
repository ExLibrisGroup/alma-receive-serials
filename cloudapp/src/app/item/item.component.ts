import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CloudAppRestService, FormGroupUtil } from '@exlibris/exl-cloudapp-angular-lib';
import { tap, switchMap, finalize } from 'rxjs/operators';
import { FormGroup, FormArray, FormControl } from '@angular/forms';
import { Item } from '../models/item';
import { Location, ReceivingResponse } from '../models/location';
import { xmlToFields } from '../models/marc-utils';
import { forkJoin } from 'rxjs';
import { ReceivingService, SUMMARY_FIELDS } from '../models/receiving.service';

@Component({
  selector: 'app-item',
  templateUrl: './item.component.html',
  styleUrls: ['./item.component.scss'],
})
export class ItemComponent implements OnInit {
  poline: any;
  form: FormGroup;
  loading = false;
  lastItem: Item;
  itemPolicies: { code: string, description: string }[];
  holdings: any[];
  results: ReceivingResponse;
  loadingSummaries: number;

  constructor(
    private route: ActivatedRoute,
    private restService: CloudAppRestService,
    private receivingService: ReceivingService
  ) { }

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    this.load(id);
  }

  load(id: string) {
    this.loading = true;
    forkJoin([
      this.restService.call(`/acq/po-lines/${id}`),
      this.restService.call('/conf/code-tables/ItemPolicy')
    ])
    .pipe(
      /* Get PO Line and Itme Policy code table */
      tap(([poline, codeTable])=>{
        this.itemPolicies = 
          codeTable.row.map(
            row=>({code: row.code, description: row.description})
          );
        this.poline=poline;
      }),
      /* Get holdings and last item */
      switchMap(([poline])=>forkJoin([
        this.restService.call(`/bibs/${poline.resource_metadata.mms_id.value}/holdings/ALL/items?order_by=description&limit=2`),
        this.restService.call(`/bibs/${poline.resource_metadata.mms_id.value}/holdings`)
      ])),
      finalize(()=>this.loading=false)
    )
    .subscribe(([items, holdings])=>{
      if (items.item && items.item.length > 0) this.lastItem = items.item[0] as Item;
      this.holdings = holdings.holding;
      const locationsForm = FormGroupUtil.toFormGroup(new Location());
      locationsForm.setValidators(this.validateLocation);
      const itemForm = FormGroupUtil.toFormGroup(new Item());
      itemForm.setValidators(this.validateItem);
      this.form = new FormGroup({
        itemTemplate: itemForm,
        locations: new FormArray([locationsForm])
      })
    })
  }

  updateCopies(index: number, target: HTMLInputElement) {
    const quantity = +target.value;
    if (quantity < 0) {
      target.value='0';
      return;
    }
    const barcodes = this.locations.at(index).get('copies.barcodes') as FormArray;
    if (barcodes.length > quantity) {
      do { barcodes.removeAt(barcodes.length-1) }
      while (barcodes.length > quantity);
    } else if (barcodes.length < quantity) {
      do { barcodes.push(new FormControl("")) }
      while (barcodes.length < quantity);
    }
  }

  getSummaries(index: number, holdingId: string) {
    this.loadingSummaries = index;
    this.restService.call(`/bibs/${this.poline.resource_metadata.mms_id.value}/holdings/${holdingId}`)
    .subscribe( resp => {
      const summaries = this.locations.at(index).get('summaries') as FormArray;
      xmlToFields(resp.anies, SUMMARY_FIELDS).forEach(s=>summaries.push(FormGroupUtil.toFormGroup(s)));
      this.loadingSummaries = null;
    })
  }

  async receive() {
    this.loading = true;
    const itemTemplate = this.form.value.itemTemplate as Item;
    const locations = this.locations.value as Location[];
    let response: ReceivingResponse = { locations: [] };
    for (const location of locations) {
      const results = await this.receivingService.receiveLocation(
        itemTemplate, 
        location, 
        this.poline.resource_metadata.mms_id.value, 
        this.poline.number
      );
      response.locations.push(results)
    }
    this.loading = false;
    this.form = null; this.lastItem = null;
    this.results = response;
  }

  fill() {
   this.form.get('itemTemplate').patchValue(this.lastItem);
  }

  addLocation() {
    let form = FormGroupUtil.toFormGroup(new Location());
    form.setValidators(this.validateLocation);
    this.locations.push(form);
  }

  deleteLocation(index) {
    this.locations.removeAt(index);
  }

  get locations() {
    return this.form.get('locations') as FormArray;
  }

  /** Validate item */
  validateItem(form: FormGroup): string[] | null {
    const itemData: Item = form.value as Item;
    let errorArray = [];

    if (!itemData.item_data.chronology_i && !itemData.item_data.enumeration_a)
      errorArray.push({code:'Item.Validation.ItemData'});
    
    return errorArray.length>0 ? errorArray : null;
  }

  /** Validate location */
  validateLocation(form: FormGroup): string[] | null {
    let errorArray = [];
    const location: Location = form.value as Location;

    if (!location.holdingId)
      errorArray.push({code:'Item.Validation.Holding'});

    if (location.copies.provideBarcodes && location.copies.barcodes.some(barcode=>!barcode))
      errorArray.push({code:'Item.Validation.Barcodes'});
    
    return errorArray.length>0 ? errorArray : null;      
  }
}
