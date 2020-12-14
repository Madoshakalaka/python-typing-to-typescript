Note: This is in an experimental stage, currently only `TypedDict`'s are handled, the interface equivalent in Python.

# TypedDict's -> Interface

Say your API is hosted with Django or Flask,
 type hinting API responses with Python's `TypedDict` is then an only sane thing to do.
```python
class Book(TypedDict):
    pages: int
    chapters: List[Chapter]
    authors: List[str]

class Chapter(TypedDict):
    title: str
    // short chapters only has one paragraph
    content: Union[str, List[Paragraph]]

class Paragraph(TypedDict):
    content: str
```

If your API consumer uses typescript, then rewriting this file as typescript interfaces is pretty much a necessity.
This tool provides a CLI that does the conversion for you.

Our output:

```typescript
interface Book {
    pages: number;
    chapters: Chapter[];
    Authors: string[];
}
interface Chapter {
    title: string;
    content: string | Paragraph[];
}
interface Paragraph {
    content: string;
}
```

# Installation

`npm i -D python-typing-to-typscript`

This creates CLI `$ pttts` (Python Typing To TypeScript)

# Usage Examples

`$ pttts schema.py schema.d.ts --python_interpreter venv/bin/python`

`$ pttts path/to/python/script.py path/to/output.ts`

Do `$ pttts -h` to see details

> Suggestion:
>
> If you are a maintainer of your python API, consider having a `schema.py` file and set up automated `@types/you-app` npm package publish.

# How

The program parses Python script with Python's built-in `ast`, and uses `typescript`'s compiler APIs to transform the ast nodes. 

# Limitations

- This is currently in an experimental stage. We mostly guaranteed it would work on our own [schema.py](https://github.com/Madoshakalaka/python-typing-to-typescript/blob/master/tests/fixtures/long_test_original.py).
Some Python typing features are not coded in yet (to name a few: `Any` `Dict` `dict` `Optional`). Don't be sad! 
Most infrastructural work is already done in [python_nodes.ts](https://github.com/Madoshakalaka/python-typing-to-typescript/blob/master/python_nodes.ts). It will be easy to support these features. Pull request / feature requests are welcome.
See below in [Typing Support](#typing-support) section for what is supported.
- You need to specify a python interpreter. It defaults to `python3` if not provided. 
And **We encourage using python 3.9**. For now, this is intended to use with python 3.9. Over python versions, python ast specification
has changed. What was an `Ellipsis` Node in python3.6 (dotdotdot notation), for example, is now a `Constant` Node. Different python versions need to be 
taken care of individually. We can support older/newer versions is there is a request. 
- The input file should only have TypedDicts classes. That is, no type aliases. 
Having extra code anywhere in the input file is OK, but code other than TypedDict classes will be ignored.
For example if you use the below file as input, the first line `User = string` will be dropped.
    
    ```python
    User = string
    
    class Book(TypedDict):
        owner: User
        price: int
        ...
    ``` 
    output:
 
    ```typescript
    interface Book{
      owner: User
      price: int
  }
    ```
  
## Typing Support

Supported:

- str, int, bool, tuple, list, **...** (ellipsis notation)
- Tuple, List, TypedDict
- Literal, Union