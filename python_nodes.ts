/**
 * @file all interfaces/classes have fields on a per-need basis, expect all of them to be underspecified (instead of
 * a full fledged python ast)
 *
 * interfaces and classes are not distinguished here. consider classes to be interfaces with methods
 */


import {PathLike} from "fs";
import * as ts from "typescript"
import {factory} from "typescript"


type PrimitiveField = string | number | null

/**
 * node data parsed for example from json.
 */
interface NodeData {

    _PyType: string

    [x: string]: NodeData | NodeData[] | PrimitiveField
}

// interface OfType<NodeDataType extends string>{
//     _PyType: NodeDataType
// }


function isNotNodeDate<T>(a: T | NodeData): a is T {
    return (a ? !a.hasOwnProperty("_PyType") : true)
}


interface ClassDefNodeData extends NodeData {
    _PyType: "ClassDef"

}


type NodeField = Node | Node[] | string | number | null

type CalculatedField = boolean


type NodeClass<T extends Node> = { _PyType(): string };


// interface TransformationContext<T> {
//
// }
//
//
// enum TransformationRule{
//     Direct
//
// }


/**
 * A Python node. See python3.9's ast page for more https://docs.python.org/3/library/ast.html
 * This class and the deriving classes is just a subset of the whole ast. Only what we need.
 */
export abstract class Node {

    // static transformationRule: TransformationContext<this>;

    static _PyType(): string {
        return this.name
    }


    // todo: What if a Python class has some boolean field?

    [x: string]: NodeField | CalculatedField | Function


    // warning: if you use Webstorm, do not use its "refactor function signature" here
    // It'll overwrite the return type of all deriving class's transform method
    // Simply change it here by hand
    /**
     * transform to (a new) typescript Node
     */
    public abstract transform(): ts.Node | ts.Node[] | undefined


    /**
     * factory method. Add more here for each new deriving class
     * @constructor
     */
    static Create(data: NodeData) {
        let node: Node;
        switch (data._PyType) {
            case "Module":
                node = new Module(data)
                break;
            case "Name":
                node = new Name(data)
                break;
            // Exists in python ast, but a irrelevant abstraction for us.
            // case "Expr":
            //     node = new Expr(data)
            //     break;
            case "Constant":
                node = new Constant(data)
                break;
            case "ClassDef":
                node = new ClassDef(data)
                break;
            case "AnnAssign":
                node = new AnnAssign(data)
                break;
            case "Store":
                node = new Store(data)
                break;
            case "Load":
                node = new Load(data)
                break;
            case "Subscript":
                node = new Subscript(data)
                break;
            case "Tuple":
                node = new Tuple(data)
                break;
            default:
                console.debug(`Debug: Ignored irrelevant Python Node: ${data._PyType}`)
                node = new AnyNode(data)
        }
        node.calculateProperties()
        return node


    }

    protected calculateProperties() {

    }


    private buildNode(fromData: NodeData): void {

        for (const [key, value] of Object.entries(fromData)) {
            if (key == "_PyType") {
            } else {

                if (isNotNodeDate(value)) {
                    if (value instanceof Array) {
                        const fieldToBuild = []
                        for (const descendantNodeData of value) {
                            fieldToBuild.push(Node.Create(descendantNodeData))
                        }
                        this[key] = fieldToBuild
                    } else {
                        this[key] = value
                    }
                } else {
                    this[key] = Node.Create(value)
                }

            }
        }
    }

    /**
     * @param data for e.g. parsed from json. Required acknowledges the fact that our Node classes have underspecified
     * members.
     */
    protected constructor(data: NodeData) {
        this.buildNode(data)
    }

    public static IsType<T extends Node>(n: Node, cls: NodeClass<T>): n is T {
        return cls._PyType() == n.constructor.name
    }


    public static IsNotType<T extends Node, V extends Node>(n: V | NodeClass<T>, cls: NodeClass<T>): n is V {
        return cls._PyType() != n.constructor.name
    }


}


/**
 * A whole python file (usually? correct me if it's wrong)
 * This class is actually unused: we directly grab TypedDict's from a module, ignoring this top level
 */
export class Module extends Node {
    body: Node[]

    transform(): undefined {
        return undefined;
    }

}


export class Name extends Node {

    id: string
    ctx: Load | Store


    /**
     * This assumes this Name appears as one of the following cases:
     *  1. class field type hint
     *  2. inside square bracket of List[] or Tuple[]
     */
    private transformInLoadContext() {

        switch (this.id) {
            case "str": {
                return factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
            }
            case "int": {
                return factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)
            }
            case "bool": {
                return factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword)
            }
            case "List":
            case "list": {
                return factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
            }
            case "tuple":
            case "Tuple": {
                // a tuple in Load context (e.g. List[Tuple]) doesn't give any information
                // thus this case should be transformed to Array<any>
                // correct me if there's a better way
                return factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
            }
            default: {
                return factory.createIdentifier(this.id)
            }
        }

    }


    transform(): ts.Identifier | ts.KeywordTypeNode {
        if (this.ctx instanceof Store) return factory.createIdentifier(this.id)
        else if (this.ctx instanceof Load) return this.transformInLoadContext()
        else return undefined
    }


}


// fixme: I think a good thing to do is to make all Node classes and deriving classes have all readonly fields
//  but either typescript doesn't support it too well, or I don't know how to do it well.

/**
 *
 */
export class ClassDef extends Node {
    private name: string
    private bases: Name[]
    private body: Node[]

    // calculated fields upon creation
    private subclassOfTypedDict: boolean


    protected calculateProperties() {
        super.calculateProperties();
        this.subclassOfTypedDict = this.isSubclassOfTypedDict()
    }

    transform(): ts.InterfaceDeclaration {
        if (this.isSubclassOfTypedDict) {
            const members: ts.PropertySignature[] = []
            for (const bodyNode of this.body) {

                // we are ignoring other nodes (like methods) in a class body
                if (Node.IsType(bodyNode, AnnAssign)) {
                    // ts what the heck? did I break TS here?
                    // specifically, if type guard in Node.isType works, then ts should know bodyNode here i a AnnAssign
                    // instead, it seems TS is just confused here and thinks the type guard doesn't work.

                    // uncomment the following line and see, AnnAssign's target node is actually a Name
                    // but typescript won't complain

                    // bodyNode.target = 1

                    // so we are actually casting ourselves:
                    members.push((<AnnAssign>bodyNode).transform())


                }

            }
            return factory.createInterfaceDeclaration(undefined, undefined, factory.createIdentifier(this.name), undefined, undefined, members)
        }

        return undefined


    }

    /**
     * Is this class a subclass of TypedDict
     */
    private isSubclassOfTypedDict(): boolean {
        for (const base of this.bases) {
            if (base.id == "TypedDict") {
                return true
            }
        }
        return false
    }

}


// class Expr extends Node {
//     // todo:
//     transform(): ts.Node | undefined {
//         return undefined;
//     }
// }


// After processing of our python serialization script, it's pretty much string
/**
 * see python39's AST page https://docs.python.org/3/library/ast.html
 */
type ASDLConstant = string | number | boolean


/**
 * The only relevant Constant is "eclipse", where value = "...", or python literals
 */
class Constant extends Node {

    value: ASDLConstant


    // What's confusing is python39's official ast page says "kind?" is a string field
    // while test cases always give null
    // Maybe it's the fault of our serializing python script

    // kind?: null // irrelevant (seems like it's always null)


    /**
     *
     */
    transform() {
        switch (typeof this.value) {
            case "string":
                return factory.createLiteralTypeNode(factory.createStringLiteral(this.value))
            case "number":
                return factory.createLiteralTypeNode(factory.createNumericLiteral(this.value))
            case "boolean":
                if (this.value) return factory.createLiteralTypeNode(factory.createTrue())
                else return factory.createLiteralTypeNode(factory.createFalse())
            default: {
                console.error(`An unexpected case happened while converting a Constant, ${this.value} is not one of string, number, or boolean`)
            }
        }
    }
}


// todo: this
class Subscript extends Node {
    value: Name
    slice: Tuple | Name | Constant
    // ctx: Load | Store | Del // irrelevant to our use case

    // we only consider the case when this subscript is a type hint
    transform(): ts.ArrayTypeNode | ts.TupleTypeNode | ts.UnionTypeNode | ts.LiteralTypeNode {

        switch (this.value.id) {
            case "List": {
                if (this.slice instanceof Tuple) return undefined
                else if (this.slice instanceof Name) {
                    const typeOrIdentifier = this.slice.transform()
                    if (ts.isIdentifierOrPrivateIdentifier(typeOrIdentifier)) {
                        return factory.createArrayTypeNode(factory.createTypePredicateNode(undefined, typeOrIdentifier, undefined))
                    } else if (ts.isTypeNode(typeOrIdentifier)) {
                        return factory.createArrayTypeNode(typeOrIdentifier)
                    } else {
                        console.error("An impossible case happened, argument of List is not understood as identifier or keyword")
                        return undefined
                    }
                }
                return undefined
            }
            case "Tuple": {
                if (this.slice instanceof Tuple) {
                    if (this.slice.hasTrailingEllipsis) {

                        // python39 only allow ellipsis to be trailing, not anywhere else
                        // This means we have an array length HOMOGENEOUS tuple (of a single type)
                        // see: https://github.com/python/typing/issues/180
                        // So in Typescript this actually corresponds to an Array
                        const typeOrIdentifier = this.slice.elts[0].transform()


                        // Tuple with ellipsis in python is converted to Array in typescript
                        // Are there idiomatic ellipsis in typescript?
                        // I actually don't know, pls tell me.
                        if (ts.isIdentifierOrPrivateIdentifier(typeOrIdentifier)) {
                            return factory.createArrayTypeNode(factory.createTypePredicateNode(undefined, typeOrIdentifier, undefined))
                        } else if (ts.isTypeNode(typeOrIdentifier)) {
                            return factory.createArrayTypeNode(typeOrIdentifier)
                        } else {
                            console.error("An impossible case happened: Tuple has trailing ellipsis but the first element is not an understandable Type")
                            return undefined
                        }

                    }
                    return factory.createTupleTypeNode(this.slice.transform())
                } else if (this.slice instanceof Name) {
                    const typeNode = this.slice.transform()
                    if (ts.isTypeNode(typeNode)) return factory.createTupleTypeNode([typeNode])
                    return undefined
                }
                return undefined
            }
            case "Literal": {
                if (this.slice instanceof Constant) {
                    return this.slice.transform()
                } else if (this.slice instanceof Tuple) {
                    return factory.createUnionTypeNode(this.slice.transform())

                } else if (this.slice instanceof Name) {
                    // todo: is this possible at all?
                    console.error("An unexpected case happened, an identifier is found in Literal[]")
                    return undefined
                } else {
                    // this should be impossible to reach
                    console.error("An unexpected case happened, Cannot parse the content inside Literal[] correctly")
                    return undefined
                }

            }
            case "Union": {

                if (this.slice instanceof Constant) {
                    // should not be possible
                    console.error("An unexpected case happened, an literal is found in Union[]")
                    return undefined
                } else if (this.slice instanceof Tuple) {
                    return factory.createUnionTypeNode(this.slice.transform())
                } else if (this.slice instanceof Name) {
                    console.error("An unexpected case happened, an identifier is found in Union[]")
                    return undefined
                } else {
                    console.error("An unexpected case happened, Cannot parse the content inside Union[] correctly")
                    return undefined
                }

            }
            default: {
                console.error(`Ignored type annotation: ${this.value.id}. This might be an unwanted behavior`)
                return undefined
            }

        }
    }

}

class Tuple extends Node {

    elts: (Name | Subscript | Constant)[] // simpler that what can actually be
    // ctx: Load // irrelevant to our use case


    // calculated properties
    hasTrailingEllipsis: boolean


    protected calculateProperties() {
        super.calculateProperties();

        this.hasTrailingEllipsis = false

        // python39 doesn't allow a single ellipsis in Tuple[]
        if (this.elts.length > 1) {
            const lastElt = this.elts[this.elts.length - 1]
            // Note we assume a Constant must be a ellipsis (3 dot notation)
            this.hasTrailingEllipsis = (Node.IsType(lastElt, Constant) && lastElt.value == "...")
        }

    }

    transform(): ts.TypeNode[] {

        // side note: has trailing ellipsis case is handled from outside
        // we can be sure this.hasTrailingEllipsis is False here

        // ts dumbdumb, .filter should guarantee the types match and we shouldn't need the casting
        return <ts.TypeNode[]>this.elts
            .map(elt => {
                const node = elt.transform()
                let typeNode

                if (ts.isTypeNode(node)) typeNode = node
                else if (ts.isIdentifierOrPrivateIdentifier(node)) typeNode = factory.createTypePredicateNode(undefined, node, undefined)
                else {
                    console.error("An unexpected case happened during Tuple conversion. Can't parse content inside Tuple[]")
                    typeNode = undefined
                }

                return typeNode
            }).filter(n => ts.isTypeNode(n))
    }


}

class Load extends Node {
    transform(): undefined {
        return undefined;
    }
}

class Store extends Node {
    transform(): undefined {
        return undefined;
    }
}


class AnnAssign extends Node {
    target: Name
    annotation: Name | Subscript
    // value?: Expr
    // simple: 0 | 1


    /**
     * correct if wrong:
     * ts.PropertySignature extends ts.TypeElement, I believe the previous one is the right one to use
     */
    transform(): ts.PropertySignature | undefined {
        const identifierNode = this.target.transform()
        let typeNode = this.annotation.transform()
        let actualTypeNode
        if (ts.isIdentifierOrPrivateIdentifier(typeNode)) {
            actualTypeNode = factory.createTypePredicateNode(undefined, typeNode, undefined)
        } else actualTypeNode = typeNode

        if (ts.isIdentifierOrPrivateIdentifier(identifierNode))
            return factory.createPropertySignature(undefined, identifierNode, undefined, actualTypeNode)
        return undefined
    }
}

/**
 * A placeholder for node we don't recognize
 */
class AnyNode extends Node {
    static _PyType(): string {
        throw new Error("We do not know the type of this node")
    }

    transform(): undefined {
        return undefined;
    }
}