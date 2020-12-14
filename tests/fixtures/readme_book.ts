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
