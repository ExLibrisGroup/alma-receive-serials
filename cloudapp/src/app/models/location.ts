import { MarcField } from "./marc-utils";

export class Location {
  holdingId: string = "";
  policy: string = "";
  copies: Copies =  new Copies() ;
  summaries: MarcField[] = [];
}

export class Copies {
  quantity: number = 1;
  provideBarcodes: boolean = true;
  barcodes: string[] = [""]
}

export interface ReceivingResponse {
  locations: ReceivingLocationResponse[]
}

export interface ReceivingLocationResponse {
  description: string,
  barcodes: string[],
  errors: string[] 
}
