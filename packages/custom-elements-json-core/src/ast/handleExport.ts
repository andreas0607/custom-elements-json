
import { JavaScriptModule, Export, VariableDeclaration, FunctionDeclaration, ClassDeclaration } from "custom-elements-json/schema";
import ts from "typescript";

export type ExportType = ts.VariableStatement
  | ts.ExportDeclaration
  | ts.FunctionDeclaration
  | ts.ClassDeclaration
  | ts.ExportAssignment;

function hasExportModifier(node: ExportType): boolean {
  if(Array.isArray(node.modifiers) && node.modifiers.length > 0) {
    if(node.modifiers.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword)) {
      return true;
    }
  }
  return false;
}

function hasDefaultModifier(node: ExportType): boolean {
  if(Array.isArray(node.modifiers) && node.modifiers.length > 0) {
    if(node.modifiers.some(mod => mod.kind === ts.SyntaxKind.DefaultKeyword)) {
      return true;
    }
  }
  return false;
}

function safePush(_export: Export | null, _declaration: VariableDeclaration | FunctionDeclaration | ClassDeclaration | null, moduleDoc: JavaScriptModule) {
  if(_export) {
    if(Array.isArray(moduleDoc.exports) && moduleDoc.exports.length > 0) {
      moduleDoc.exports.push(_export);
    } else {
      moduleDoc.exports = [_export];
    }
  }

  if(_declaration) {
    if(Array.isArray(moduleDoc.declarations) && moduleDoc.declarations.length > 0) {
      moduleDoc.declarations.push(_declaration);
    } else {
      moduleDoc.declarations = [_declaration]
    }
  }
}

/**
 *
 * @example export { var1, var2 };
 */
function hasNamedExports(node: ts.ExportDeclaration): boolean {
  if(
    Array.isArray((node as any).exportClause?.elements) &&
    (node as any).exportClause.elements.length > 0
  ) {
    return true;
  }
  return false;
}

/**
 * @example export { var1, var2 } from 'foo';
 */
function isReexport(node: ts.ExportDeclaration): boolean {
  if(
    node.moduleSpecifier !== undefined
  ) {
    return true;
  }
  return false;
}

function isBareModuleSpecifier(path: string): boolean {
  return !path.startsWith("'./");
}

export function handleExport(node: ExportType, moduleDoc: JavaScriptModule) {
  if(node.kind === ts.SyntaxKind.VariableStatement) {
    if(hasExportModifier(node)) {
      node.declarationList.declarations.forEach(declaration => {
        const _export: Export = {
          kind: "js",
          name: declaration.name.getText(),
          declaration: {
            name: declaration.name.getText(),
            module: moduleDoc.path
          }
        };

        // @TODO: add description, type, default
        const _declaration: VariableDeclaration = {
          kind: 'variable',
          name: declaration.name.getText(),
        }

        safePush(_export, _declaration, moduleDoc);
      });
    } else {
      node.declarationList.declarations.forEach(declaration => {
        // @TODO: add description, type, default
        const _declaration: VariableDeclaration = {
          kind: 'variable',
          name: declaration.name.getText(),
        }

        safePush(null, _declaration, moduleDoc);
      });
    }
  }

  /**
   * @example export default var1;
   */
  if(node.kind === ts.SyntaxKind.ExportAssignment) {
    // @TODO: var8 can be imported from a different package, module, or declared in the local module. Find where it comes from
    const _export: Export = {
      kind: "js",
      name: "default",
      declaration: {
        name: (node.expression as ts.Identifier).text,
        module: moduleDoc.path
      }
    };
    safePush(_export, null, moduleDoc);
  }

  if(node.kind === ts.SyntaxKind.ExportDeclaration) {
    /**
     * @example export { var1, var2 };
     */
    if(hasNamedExports(node) && !isReexport(node)) {
      (node as any).exportClause?.elements?.forEach((element: any) => {

        // @TODO: these could be reexports, need to find module or package
        const _export: Export = {
          kind: "js",
          name: element.name.getText(),
          declaration: {
            name: element.propertyName?.getText() || element.name.getText(),
            module: moduleDoc.path
          }
        };

        safePush(_export, null, moduleDoc);
      });
    }

    /**
     * @example export * from 'foo';
     * @example export * from './my-module.js';
     */
    if(isReexport(node) && !hasNamedExports(node)) {
      const _export: Export = {
        kind: "js",
        name: "*",
        declaration: {
          name: "*",
          package: node.moduleSpecifier!.getText().replace(/'/g, '')
        }
      }
      safePush(_export, null, moduleDoc);
    }

    /**
     * @example export { var1, var2 } from 'foo';
     * @example export { var1, var2 } from './my-module.js';
     */
    if(isReexport(node) && hasNamedExports(node)) {
      (node as any).exportClause?.elements?.forEach((element: any) => {
        const _export: Export = {
          kind: "js",
          name: element.name.getText(),
          declaration: {
            name: element.propertyName?.getText() || element.name.getText()
          }
        }

        if(isBareModuleSpecifier(node.moduleSpecifier!.getText())) {
          _export.declaration.package = node.moduleSpecifier!.getText().replace(/'/g, '');
        } else {
          _export.declaration.module = node.moduleSpecifier!.getText().replace(/'/g, '');
        }

        safePush(_export, null, moduleDoc);
      });
    }
  }

  if(node.kind === ts.SyntaxKind.FunctionDeclaration) {
    if(hasExportModifier(node)) {
      const isDefault = hasDefaultModifier(node);
      const _export: Export = {
        kind: "js",
        name: isDefault ? "default" : node.name?.getText() || "",
        declaration: {
          name: node.name?.getText() || "",
          module: moduleDoc.path
        }
      }

      // @TODO: add description, type, parameters, returntype
      const _declaration: FunctionDeclaration = {
        kind: 'function',
        name: node.name?.getText() || "",
      }

      safePush(_export, _declaration, moduleDoc);
    }
  }

  /**
   * @example export class Class1 {}
   */
  if(node.kind === ts.SyntaxKind.ClassDeclaration) {
    if(hasExportModifier(node)) {
      const _export: Export = {
        kind: "js",
        name: node?.name?.text || "",
        declaration: {
          name: node?.name?.text || "",
          module: moduleDoc.path
        }
      }
      safePush(_export, null, moduleDoc);
    }
  }
}