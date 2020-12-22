// sometimes it's useful to test with a target script and know what nodes there are


import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import {visitNode, VisitResult} from 'typescript';

// visitor class
class MyVisitor {

    readonly kinds: string[];

    constructor() {
        this.kinds = [];
    }

    visit(node: ts.Node): VisitResult<ts.Node> {
        this.kinds.push(ts.SyntaxKind[node.kind]);
        return node

    }

}

const myVisitor = new MyVisitor()

// load & parse file
const fileName: string = path.resolve(__dirname, 'target_test_script.ts')
const sourceFile = ts.createSourceFile(
    fileName,
    fs.readFileSync(fileName, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
);


// fixme: shouldn't pass in sourceFile here. Should convert sourceFile to a Node (maybe convert it to a Bundle first?)

// walk AST
visitNode(sourceFile, n => myVisitor.visit(n))

// show results
console.log(myVisitor.kinds.join('\n'));