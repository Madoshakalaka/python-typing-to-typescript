#!/usr/bin/env node

import * as fs from 'fs'
import {PathLike} from 'fs'
import * as py from "./python_nodes";

import {ArgumentParser} from 'argparse'
import * as temp from 'temp'
import {spawn} from 'child_process'
import * as path from "path"
import ts = require("typescript");


const {version} = require('./package.json');


/**
 * Note we only care about module level Python classes, that is, for example, inner nested classes will be ignored
 * @param source a xx_ast.json converted from xx.py by py_to_ast_json.py
 */
export function extractModuleLevelTypedDicts(source: PathLike): py.ClassDef[] {
    const buffer = fs.readFileSync(source)
    // correct me if I'm wrong: the source has to be a module
    const _moduleObj = JSON.parse(buffer.toString())
    const module = py.Node.Create(_moduleObj)

    if (! py.Node.IsType(module, py.Module)){
        console.error("Failed to parse python module")
        process.exit(1)
    }



    const ret: py.ClassDef[] = []

    for (const child of (<py.Module>module).body) {
        if (py.Node.IsType(child, py.ClassDef)) {
            if (child.isSubclassOfTypedDict) ret.push(<py.ClassDef>child)
        }
    }
    return ret

}


/**
 * @param source_ast_json The source json file of Python ast
 */
export function convertTypedDicts(source_ast_json: PathLike): ts.InterfaceDeclaration[] {
    return extractModuleLevelTypedDicts(source_ast_json).map(typedDict => typedDict.transform())
}


/**
 * @param source_ast_json The source json file of Python ast
 * @param target The target typescript file. If omitted, will log to stdout
 */
export function convert(source_ast_json: PathLike, target?: PathLike) {
    const interfaceDeclarations = extractModuleLevelTypedDicts(source_ast_json).map(typedDict => typedDict.transform())


    let result = ""

    for (const interfaceDeclaration of interfaceDeclarations) {

        const resultFile = ts.createSourceFile("someFileName.ts", "", ts.ScriptTarget.Latest, /*setParentNodes*/ false, ts.ScriptKind.TS);
        const printer = ts.createPrinter({newLine: ts.NewLineKind.LineFeed});

        result += printer.printNode(ts.EmitHint.Unspecified, interfaceDeclaration, resultFile) + "\n"

    }

    if (target) {
        fs.writeFileSync(target, result)
    } else {
        console.log(result)
    }


    console.log("Conversion Successful!")


}

if (require.main === module) {


    const parser = new ArgumentParser({
        description: "Convert Python TypedDict to Typescript Interface"
    });

    parser.add_argument('-v', '--version', {action: 'version', version});
    parser.add_argument('input_file', {help: 'Python file that has TypedDict classes in it'});
    parser.add_argument('output_file', {help: 'Output typescript file'});
    parser.add_argument('--python_interpreter', '-p', {help: 'Path to python interpreter', default: "python3"});


    const args = parser.parse_args()

    console.log("Thanks for using, this is in an experimental stage. Feature requests/ pull requests are welcomed")

    // Automatically track and cleanup files at exit
    temp.track()

// Process the data (note: error handling omitted)
    temp.open('py_ast', function (err, info) {
        if (!err) {
            const dumpPythonASTProc = spawn(args.python_interpreter, [path.resolve(__dirname, "py_to_ast_json.py"),args.input_file,info.path], {shell:true})
            dumpPythonASTProc.stdout.on('data', data=>console.log(data.toString()))
            dumpPythonASTProc.stderr.on('data', data=>console.error(data.toString()))
            dumpPythonASTProc.on('close', code=>{
                convert(info.path, args.output_file)
                return process.exit(code)
            })


            fs.close(info.fd, function (err) {
            });
        }
    });

}


// const resultFile = ts.createSourceFile("someFileName.ts", "", ts.ScriptTarget.Latest, /*setParentNodes*/ false, ts.ScriptKind.TS);
// const printer = ts.createPrinter({newLine: ts.NewLineKind.LineFeed});
//
// const result = printer.printNode(ts.EmitHint.Unspecified, makeFactorialFunction(), resultFile);
//
// console.log(result);



