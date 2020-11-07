const Didact = {};
Didact.createElement = function (type, props, ...children) {
    let element = {
        type,
        props: {
            ...props,
            children: children.map(child =>
                typeof child === "object"
                    ? child
                    : Didact.createTextElement(child)
            )
        }
    }
    return element;
}

Didact.createTextElement = function (text) {
    let element = {
        type: "TEXT_ELEMENT",
        props: {
            nodeValue: text,
            children: []
        }
    }
    return element;
}

Didact.render = function (element, container) {
    if (element.type === "TEXT_ELEMENT") {
        let node = document.createTextNode(element.props.nodeValue);
        container.appendChild(node);
    }
    else {
        let node = document.createElement(element.type);
        container.appendChild(node);
        for (key in element.props) {
            if (key === "children") {
                let children = element.props.children;
                if (children) {
                    children.forEach(child => {
                        Didact.render(child, node);
                    })
                }
            }
            else {
                node[key] = element.props[key];
            }
        }
    }
}