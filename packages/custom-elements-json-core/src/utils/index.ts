import ts from 'typescript';
import {
  CustomElement,
  VariableDeclaration,
  FunctionDeclaration,
  ClassDeclaration,
  JavaScriptModule,
  Export,
} from 'custom-elements-json/schema';
import { JSDoc } from './extractJsDoc';

function isValidArray(array: any) {
  return Array.isArray(array) && array.length > 0;
}

/** CLASS */
export function hasModifiers(node: any): boolean {
  return isValidArray(node.modifiers);
}

export function hasJsDoc(node: any): boolean {
  return isValidArray(node.jsDoc);
}

export function hasStaticKeyword(node: any): boolean {
  return !!node?.modifiers?.find((mod: any) => mod.kind === ts.SyntaxKind.StaticKeyword);
}

export function isAlsoProperty(node: any) {
  let result = true;
  ((node.initializer as ts.ObjectLiteralExpression) || node).properties.forEach((property: any) => {
    if (
      (property.name as ts.Identifier).text === 'attribute' &&
      property.initializer.kind === ts.SyntaxKind.FalseKeyword
    ) {
      result = false;
    }
  });
  return result;
}

export function getAttrName(node: any): string | undefined {
  let result = undefined;
  ((node.initializer as ts.ObjectLiteralExpression) || node).properties.forEach((property: any) => {
    if (
      (property.name as ts.Identifier).text === 'attribute' &&
      property.initializer.kind !== ts.SyntaxKind.FalseKeyword
    ) {
      result = property.initializer.text;
    }
  });
  return result;
}

export function getReturnVal(node: any) {
  if (ts.isGetAccessor(node)) {
    return (node.body!.statements.find(
      (statement: any) => statement.kind === ts.SyntaxKind.ReturnStatement,
    ) as ts.ReturnStatement).expression;
  } else {
    return node.initializer;
  }
}

export function alreadyHasAttributes(doc: CustomElement): boolean {
  return isValidArray(doc.attributes);
}

export function hasPropertyDecorator(
  node: ts.PropertyDeclaration | ts.GetAccessorDeclaration | ts.SetAccessorDeclaration,
): boolean {
  return (
    isValidArray(node.decorators) &&
    node.decorators!.some((decorator: ts.Decorator) => ts.isDecorator(decorator))
  );
}

/** EXPORTS */
export type ExportType =
  | ts.VariableStatement
  | ts.ExportDeclaration
  | ts.FunctionDeclaration
  | ts.ClassDeclaration
  | ts.ExportAssignment;

export function hasExportModifier(node: ExportType): boolean {
  if (isValidArray(node.modifiers)) {
    if (node.modifiers!.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword)) {
      return true;
    }
  }
  return false;
}

export function hasDefaultModifier(node: ExportType): boolean {
  if (isValidArray(node.modifiers)) {
    if (node.modifiers!.some(mod => mod.kind === ts.SyntaxKind.DefaultKeyword)) {
      return true;
    }
  }
  return false;
}

export function safePush(
  _export: Export | null,
  _declaration: VariableDeclaration | FunctionDeclaration | ClassDeclaration | null,
  moduleDoc: JavaScriptModule,
  ignore: string | undefined,
) {
  if (_export) {
    if (isValidArray(moduleDoc.exports)) {
      moduleDoc.exports!.push(_export);
    } else {
      moduleDoc.exports = [_export];
    }
  }

  if (_declaration) {
    if (ignore !== undefined && _declaration.name === ignore) return;
    if (isValidArray(moduleDoc.declarations)) {
      moduleDoc.declarations.push(_declaration);
    } else {
      moduleDoc.declarations = [_declaration];
    }
  }
}

/**
 *
 * @example export { var1, var2 };
 */
export function hasNamedExports(node: ts.ExportDeclaration): boolean {
  if (isValidArray((node as any).exportClause?.elements)) {
    return true;
  }
  return false;
}

/**
 * @example export { var1, var2 } from 'foo';
 */
export function isReexport(node: ts.ExportDeclaration): boolean {
  if (node.moduleSpecifier !== undefined) {
    return true;
  }
  return false;
}

export interface Mixin {
  name: string;
}

export function extractMixins(jsDocs: JSDoc[]): Mixin[] {
  if (isValidArray(jsDocs)) {
    return jsDocs
      .filter(jsDoc => jsDoc.tag === 'mixin')
      .map(jsDoc => ({
        name: jsDoc.type,
      }));
  } else {
    return [];
  }
}

export function hasMixins(mixins: Mixin[]) {
  return isValidArray(mixins);
}

/** IMPORTS */

/** @example import defaultExport from 'foo'; */
export function hasDefaultImport(node: ts.ImportDeclaration): boolean {
  // eslint-disable-line
  return !!node?.importClause?.name;
}

/** @example import {namedA, namedB} from 'foo'; */
export function hasNamedImport(node: any): boolean {
  return isValidArray(node?.importClause?.namedBindings?.elements);
}

/** @example import * as name from './my-module.js'; */
export function hasAggregatingImport(node: any): boolean {
  return !!node?.importClause?.namedBindings?.name && !hasNamedImport(node);
}

export function isBareModuleSpecifier(specifier: string): boolean {
  return !!specifier.replace(/'/g, '')[0].match(/[a-zA-Z]/g);
}

export interface Import {
  name: string;
  kind: 'default' | 'named' | 'aggregate' | 'javascript-module';
  importPath: string;
  isBareModuleSpecifier: boolean;
}

/** Type asserters */
export function isImport<T>(C: T | Import): C is Import {
  if ('importPath' in C && 'isBareModuleSpecifier' in C) {
    return true;
  }
  return false;
}
