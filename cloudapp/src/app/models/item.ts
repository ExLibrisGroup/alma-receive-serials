export class Item {
  holding_data: HoldingData = new HoldingData();
  item_data: ItemData = new ItemData()
}

export class HoldingData {
  holding_id: string = ""
}

export class ItemData {
  barcode: string = "";
  policy: ValueString = new ValueString();
  chronology_i: string = "";
  chronology_j: string = "";
  chronology_k: string = "";
  enumeration_a: string = "";
  enumeration_b: string = "";
  enumeration_c: string = "";
  public_note: string = "";
  internal_note_1: string = "";
  description: string = "";
}

export class ValueString {
  value: string = ""
}
