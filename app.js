let root = document.getElementById("root");

let element = Didact.createElement(
    "div",
    {id : "foo"},
    Didact.createElement(
        "a",
        null,
        "bar"
    ),
    Didact.createElement(
        "b"
    )
)

console.log(element);
Didact.render(element,root);