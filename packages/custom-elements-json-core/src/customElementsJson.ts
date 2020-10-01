import ts from 'typescript';
import { CustomElementsJson } from '@custom-elements-json/helpers';
import { Import } from './ast/handleImport';

export class ExtendedCustomElementsJson extends CustomElementsJson {
  currentModule: any;
  imports: any;

  setCurrentModule(source: any) {
    this.currentModule = source;
  }

  setImportsForCurrentModule(imports: Import[]) {
    this.imports = [...this.imports || [], ...imports];
  }

  visitCurrentModule(cb: (node: any) => void) {
    visitNode(this.currentModule);

    function visitNode(node: ts.Node) {
      cb(node)
      ts.forEachChild(node, visitNode);
    }
  }
}



export const customElementsJson = new ExtendedCustomElementsJson();
