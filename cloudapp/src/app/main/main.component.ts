import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CloudAppEventsService, CloudAppRestService, Entity, EntityType, Request } from '@exlibris/exl-cloudapp-angular-lib';
import { ToastrService } from 'ngx-toastr';
import { MatPaginator, PageEvent } from '@angular/material/paginator'

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit, OnDestroy {

  private pageLoad$: Subscription;
  entities: Entity[] = [];
  selected: Entity;
  loading = false;
  searchResults = 0;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild('searchbox') searchbox: ElementRef;

  constructor(
    private eventsService: CloudAppEventsService,
    private restService: CloudAppRestService,
    private toastr: ToastrService
  ) { }

  ngOnInit() {

  }

  ngAfterViewInit() {
    this.pageLoad$ = this.eventsService.onPageLoad( pageInfo => {
      this.searchbox.nativeElement.value = '';
      this.searchResults = 0;
      this.entities = (pageInfo.entities||[])
        .filter(e=>e.type==EntityType.PO_LINE);
      if (this.entities.length==1) {
        this.selected = this.entities[0];
      }
    });
  }

  ngOnDestroy(): void {
    this.pageLoad$.unsubscribe();
  }

  search(val: string, limit=10, offset=0) {
    this.loading = true;
    let request: Request = { url: '/acq/po-lines'};
    if (val.match(/POL-\d*/)) {
      request.url += `/${val}`
    } else {
      request.queryParams = {
        q: `all~${almaq(val)}`,
        limit: limit,
        offset: offset
      }
    }
    this.restService.call(request)
    .pipe( finalize(()=>this.loading=false) )
    .subscribe(
      results => {
        console.log('results', results);
        this.searchResults = results.total_record_count;
        this.entities=(results.po_line || []).map(p=>({
          id: p.number,
          type: EntityType.PO_LINE,
          link: p.link,
          description: p.resource_metadata.title
        }));
      },
      e => this.toastr.error(`Could not retrieve search results: ${e.message}`)
    );
  }

  pageResults(event: PageEvent) {
    this.search(
      this.searchbox.nativeElement.value, 
      event.pageSize, 
      event.pageIndex*event.pageSize
    )
  }
}

const almaq = (term: string) => term.replace(/\s/g, '_');