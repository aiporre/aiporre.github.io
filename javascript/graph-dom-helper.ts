function queryElem(selector: string, type: typeof Element): Element {
    const elem = document.querySelector(selector);
    if (elem === null || !(elem instanceof type))
        throw new Error(`Expected element matching selector: ${selector}`);
    return elem;
}
