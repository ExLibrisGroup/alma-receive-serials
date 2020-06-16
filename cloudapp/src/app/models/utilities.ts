import { Observable, of } from "rxjs";
import { catchError } from "rxjs/operators";

export const Utils = {
  /** Execute XPath */
  select: (doc: Document, expression: string, options: {context?: Node, single?: boolean}={context: null, single: false}) => 
  doc.evaluate(expression, options.context || doc, null, options.single ? XPathResult.FIRST_ORDERED_NODE_TYPE : XPathResult.ANY_TYPE, null),

  withErrorChecking: (obs: Observable<any>, obj: Object = {}): Observable<any> => {
    obj = Object.assign(obj, {isError: true});
    return obs.pipe(catchError( e => of(Object.assign(e, obj)) ));
  },

  /** Adds Element to dom and returns it */
  dom: (name: string, options: {parent?: Element | Node, text?: string, className?: string, 
    id?: string, attributes?: string[][]} = {}): Element => {

    let ns = options.parent ? options.parent.namespaceURI : '';
    let element = document.createElementNS(ns, name);
    
    if (options.parent) options.parent.appendChild(element);
    if (options.text) element.innerHTML = options.text;
    if (options.className) element.className = options.className;
    if (options.id) element.id = options.id;
    if (options.attributes) options.attributes.forEach(([att, val]) => element.setAttribute(att, val));

    return element;  
  }
}