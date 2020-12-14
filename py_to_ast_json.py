#!/usr/bin/env python
import argparse
import ast
import json
from _ast import AST
from pathlib import Path


def print_parsed_result(file: Path, out:Path):
    node = ast.parse(file.read_text())

    json_out = ast2json(node)

#    with open(Path(file.stem + "_ast").with_suffix(".json"), "w") as f:
#        json.dump(json.loads(json_out), f, indent=2)

    with open(Path(out), "w") as f:
        json.dump(json.loads(json_out), f, indent=2)


def ast2json(node) -> str:
    if not isinstance(node, AST):
        raise TypeError('expected AST, got %r' % node.__class__.__name__)

    def _format(node) -> str:
        if isinstance(node, AST):
            name = node.__class__.__name__
            fields = [('_PyType', _format(name))]
            fields += [(a, _format(b)) for a, b in iter_fields(node)]
            return '{ %s }' % ', '.join(('"%s": %s' % field for field in fields))

        if isinstance(node, list):
            return '[ %s ]' % ', '.join([_format(x) for x in node])

        # todo: better handling here?
        #   this doesn't distinguish between
        #       some_name: Tuple[a, ...] and some_name: Tuple[a, "..."]
        #   both are serialized to
        #                   {
        #                   "_PyType": "Constant",
        #                   "value": "...",
        #                   "kind": null
        #                 }
        if node is ...:
            return json.dumps("...")

        return json.dumps(node)

    return _format(node)


def iter_fields(node):
    for field in node._fields:
        try:
            yield field, getattr(node, field)
        except AttributeError:
            pass


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("py_file")
    parser.add_argument("json_dump_file")

    args = parser.parse_args()

    print_parsed_result(Path(args.py_file), Path(args.json_dump_file))
