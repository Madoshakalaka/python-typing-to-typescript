"""
this file contains `TypedDict` classes that effectively serves as json schema for serialized objects
"""
from typing import List, Tuple, Union

from typing_extensions import Literal, TypedDict


class SerializedDefinition(TypedDict):
    text: str
    source_ids: Tuple[str, ...]