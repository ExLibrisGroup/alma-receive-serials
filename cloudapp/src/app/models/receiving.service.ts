import { Injectable } from '@angular/core';
import { CloudAppRestService, HttpMethod } from '@exlibris/exl-cloudapp-angular-lib';
import { Item } from './item';
import { Location, ReceivingLocationResponse } from './location';
import { Observable, forkJoin, iif, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Utils } from './utilities';
import { replaceFields } from './marc-utils';

export const SUMMARY_FIELDS = ['853', '854', '855', '863', '864', '865'];

@Injectable()
export class ReceivingService {

  constructor(
    private restService: CloudAppRestService
  ) { }

  async receiveLocation(itemTemplate: Item, location: Location, mmsId: string, polNumber: string): Promise<ReceivingLocationResponse> {
    /*
      * For each location
      * Combine item data with holding ID & policy
      * Create POST request for each item
      * ForkJoin
      * Update holdings record (remove summaries and add)
      * Report back
    */    
    return new Promise(resolve => {
      let items = new Array<Observable<any>>();
      let response: ReceivingLocationResponse;
      for (let i = 0; i < location.copies.quantity; i++) {
        items.push(
          this.createItem(
            itemTemplate, 
            location.holdingId, 
            polNumber,
            location.copies.provideBarcodes 
              ? location.copies.barcodes[i] 
              : null, 
            location.policy
          )
        )
      }
      forkJoin(items).pipe(
        map(results => {
          response = {
            description: location.holdingId,
            barcodes: results.filter(r=>!r.isError).map(item=>item.item_data.barcode),
            errors: results.filter(r=>r.isError).map(e=>e.message)
          }
          return response.errors;
        }),
        switchMap(errors => iif(
          () => errors.length == 0,
          Utils.withErrorChecking(this.updateHolding(location, mmsId)),
          of(null)
        ))
      )
      .subscribe({
        next: results => {
          if (results && results.isError) {
            response.errors.push('Could not update holding record: ' + results.message)
          }
          resolve(response);
        }
      })
    })
  }

  private updateHolding(location: Location, mmsId: string) {
    const uri = `/bibs/${mmsId}/holdings/${location.holdingId}`;
    return this.restService.call(uri)
    .pipe( 
      map(resp => replaceFields(resp.anies, SUMMARY_FIELDS, location.summaries)),
      switchMap(xml => this.restService.call({
        url: uri,
        headers: { 
          "Content-Type": "application/xml",
          Accept: "application/json" },
        requestBody: `<holding>${xml}</holding>`,
        method: HttpMethod.PUT
      })),
      map(resp=>true)
    )
  }

  private createItem(item: Item, holdingId: string, polNumber: string, barcode: string = "", policy: string = "" ) {
    item.holding_data.holding_id = holdingId;
    item.item_data.barcode = barcode;
    item.item_data.policy.value = policy;
    //console.log('item', JSON.stringify(item));
    return Utils.withErrorChecking(this.restService.call({
      url: `/acq/po-lines/${polNumber}/items`,
      method: HttpMethod.POST,
      requestBody: item
    }))
  }
}
