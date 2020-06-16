import { Utils } from "./utilities";

export interface MarcField {
  tag: string;
  ind1: string;
  ind2: string;
  value: string;
}

const xmlToMarcField = (datafield: Element, doc: Document): MarcField => {
  let subfield: Element, values: string[] = []  ;
  let subfields = Utils.select(doc, 'subfield', {context: datafield});
  while (subfield=subfields.iterateNext() as Element) {
    values.push(`$$${subfield.getAttribute('code')} ${subfield.textContent}`);
  }
  return {
    tag: datafield.getAttribute('tag'),
    ind1: datafield.getAttribute('ind1'),
    ind2: datafield.getAttribute('ind2'),
    value: values.join(' ')
  };
}

/*** Select data fields from XML and return as MarcField objects */
export const xmlToFields = (xml: string, codes: string[]): MarcField[] => {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const datafields = Utils.select(doc, `/record/datafield[contains('${codes.join(' ')}', @tag)]`);
  let datafield: Element, fields: MarcField[] = [];
  while (datafield=datafields.iterateNext() as Element) {
    fields.push(xmlToMarcField(datafield, doc));
  }
  return fields;
}

/*** Remove fields from XML and replace with provided MarcFields */
export const replaceFields = ( marcxml: string, codes: string[], summaries: MarcField[] ): string => {
  const doc = new DOMParser().parseFromString(marcxml, "application/xml");
  const datafields = doc.evaluate(`/record/datafield[contains('${codes.join(' ')}', @tag)]`, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  const rootNode = Utils.select(doc, `/record`, { single: true }).singleNodeValue;

  for (let i=0; i<datafields.snapshotLength; i++) {
    const node = datafields.snapshotItem(i)
    node.parentNode.removeChild(node);
  }

  summaries.forEach(summary=>{
    const node = Utils.dom('datafield', { parent: rootNode, attributes: [['tag', summary.tag], ['ind1', summary.ind1], ['ind2', summary.ind2]]})
      const subfields = summary.value.split('$$');
    subfields.forEach(subfield=>{
      if (subfield!='') {
        const matches = subfield.match(/^.\s*(.*)$/)
        const [tag, val] = [subfield.charAt(0), matches[1].trim()];
        Utils.dom("subfield", { parent: node, text: val, attributes: [['code', tag]] });
      }
    })
  })
  return new XMLSerializer().serializeToString(doc.documentElement);
}

