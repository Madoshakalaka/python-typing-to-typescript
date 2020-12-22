import * as path from 'path'
import {convert, convertTypedDicts, extractModuleLevelTypedDicts} from "../py_ast_json_to_ts";


it('tests extractModuleLevelTypedDicts on short example', function () {
    // todo: do real tests (currently it's eyeballing)
    const ret = extractModuleLevelTypedDicts(path.resolve(__dirname, "fixtures", "short_test_ast.json"))
    console.log(ret)
});

it('tests typedDict conversion on short example', function () {
    // todo: do real tests (currently we only make sure it doesn't error out)
    const ret = convertTypedDicts(path.resolve(__dirname, "fixtures", "short_test_ast.json"))

});




it('tests extractModuleLevelTypedDicts on long case', function () {
    // todo: do real tests (currently it's eyeballing)
    const ret = extractModuleLevelTypedDicts(path.resolve(__dirname, "fixtures", "long_test_ast.json"))
    console.log(ret)
});

it('tests typedDict conversion on long example', function () {
    // todo: do real tests (currently we only make sure it doesn't error out)
    const ret = convertTypedDicts(path.resolve(__dirname, "fixtures", "long_test_ast.json"))
})



it('tests conversion on short example', function () {
    // todo: do real tests (currently we are only eyeballing)
    convert(path.resolve(__dirname, "fixtures", "short_test_ast.json"))
})

it('tests conversion on long example', function () {
    // todo: do real tests (currently we are only eyeballing)
    convert(path.resolve(__dirname, "fixtures", "long_test_ast.json"))
})


