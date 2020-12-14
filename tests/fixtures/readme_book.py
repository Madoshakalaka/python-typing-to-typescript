from typing import TypedDict

class Book(TypedDict):
    pages: int
    chapters: List[Chapter]
    Authors: List[str]

class Chapter(TypedDict):
    title: str
    # short chapters only has one paragraph
    content: Union[str, List[Paragraph]]

class Paragraph(TypedDict):
    content: str