# Build your own React

> 原文链接：https://pomb.us/build-your-own-react/
>
> 作者：Rodrigo Pombo
>
> 译者：[ZhouMeng666](https://github.com/ZhouMeng666)

## 译者注

建议阅读本文前对ES6语法有一定了解，以及在[React官网](https://react.docschina.org/)上阅读相关文档

## 序

我们将要遵循排除了所有优化和非必须特性的真实react代码结构，一步接一步地从零开始重写React框架。

你也许读过我以前的某一篇“构建你自己的React”文章，他们的区别在于本文是基于React 16.8的，所以我们可以使用hooks并删除所有和类相关的代码。

你可以在 [Didact repo](https://github.com/pomber/didact)上找到旧博客和代码的历史记录，其中也有一个相关内容的讨论，但本文是一个独立的帖子。

从头开始，我们将逐一为我们的React版本添加以下内容：

1. `createElement`函数
2. `render`函数
3. Concurrent Mode（并行模式）
4. Fibers
5. Render和Commit阶段
6. Reconciliation （调和）
7. Function Components（函数组件）
8. Hooks

## 第零步：回顾

但首先让我们回顾一下一些基本概念。如果您已经很清楚React、JSX和DOM元素的工作原理，那么可以跳过这一步。

``` javascript
const element = <h1 title="foo">Hello</h1>
const container = document.getElementById("root")
ReactDOM.render(element, container)
```

我们使用这个React app，只需三行代码。第一行定义了React元素。下一行从DOM获取一个节点。最后一行将React元素呈现到容器中。

让我们删除所有React代码，用原生的JavaScript代替它。

在第一行中我们用JSX定义了一个元素，它不是有效的JS，所以我们用原生JS来代替它。

JSX通过Babel等构建工具转换为JS。转换通常很简单：用对`createElement`的调用替换标签内部的代码，将标签名、属性和子元素作为参数传递。

```javascript
const element = React.createElement(
  "h1",
  { title: "foo" },
  "Hello"
)
```

`React.createElement`从其参数创建对象。除此之外，还有一些验证。所以我们可以安全地用它的输出替换函数调用。

```javascript
const element = {
  type: "h1",
  props: {
    title: "foo",
    children: "Hello",
  },
}
```

这就是元素，一个有两个属性的对象：`type`和`props`（实际上它有更多，但我们只关心这两个）。

`type`是一个字符串，指定要创建的DOM节点的类型。当你想创建一个HTML元素时，它是你传递给`document.createElement`的`tagName`。它也可以是一个函数，我们将在第七步实现。

props是另一个对象，它拥有来自JSX属性的所有键和值。它还有一个特殊的属性：`children`。

本例中的子元素`children`是一个字符串，但它通常是一个包含多个元素的数组。所以一个元素也是一颗树。

```javascript
ReactDOM.render(element, container)
```

我们需要替换的另一段React代码是调用`ReactDOM.render`。

render是React更改DOM的地方，所以让我们自己来进行更新。

```javascript
const node = document.createElement(element.type)
node["title"] = element.props.title
```

首先，我们使用element中的`type`属性创建一个节点`node`，在本例中是`h1`。

然后我们将element中`props`的所有属性赋给节点，这里我们只用到了`title`。

注：为了避免混淆，我将使用“元素”来表示React元素，并使用“节点”来表示DOM元素。

```javascript
const text = document.createTextNode("")
text["nodeValue"] = element.props.children
```

然后我们为子元素创建节点。我们只有一个字符串作为子元素，所以我们创建了一个文本节点。

使用`textNode`而不是设置`innerText`将允许我们以后以相同的方式处理所有元素。还要注意我们是如何设置`nodeValue`的，就像我们对h1标题所做的那样，这就好像字符串有了`props:{nodeValue:“hello”}`。

```javascript
node.appendChild(text)
container.appendChild(node)
```

最后，我们将`textNode`添加到`h1`，`h1`添加到容器。

现在我们有了和以前一样的app，但是没有使用React。

## 第一步：createElement函数

```javascript
const element = (
  <div id="foo">
    <a>bar</a>
    <b />
  </div>
)
const container = document.getElementById("root")
ReactDOM.render(element, container)
```

我们以另一个app来再次开始，这次我们要用我们自己的React版本来替换掉React代码

我们将从实现自己的`createElement`开始。

让我们将JSX转换为JS，这样我们就可以看到`createElement`调用。

```javascript
const element = React.createElement(
  "div",
  { id: "foo" },
  React.createElement("a", null, "bar"),
  React.createElement("b")
)
```

正如我们在上一步中看到的，元素是一个具有`type`和`props`的对象。我们的函数只需要创建这个对象。

```javascript
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children,
    },
  }
}
```

我们对`props`使用`spread`运算符，对子元素使用`rest`参数语法，这样子元素属性将始终是一个数组。

例如，`createElement("div")`将返回

```javascript
{
    "type" : "div",
    "props":{"children" : []}
}
```

`createElement("div",null,a)`将返回

```javascript
{
    "type" : "div",
    "props":{"children" : [a]}
}
```

`createElement("div",null,a,b)`将返回

```javascript
{
    "type" : "div",
    "props":{"children" : [a,b]}
}
```

子数组也可以包含字符串或数字等基本值。所以我们将把所有不是对象的东西包装在它自己的元素中，并为它们创建一个特殊的类型：TEXT_element。

```javascript
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child =>
        typeof child === "object"
          ? child
          : createTextElement(child)
      ),
    },
  }
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  }
}
```



React不会在没有子元素的情况下包装原始值或创建空数组，但我们这样做是因为这样可以简化代码，在我们的库里，我们更喜欢简单的代码而不是性能更好的代码。

我们仍在使用React的`createElement`。

为了取代它，让我们给库起个名字吧。我们需要一个听起来像React但也暗示其教学目的的名字。

我们叫它 Didact吧。

```javascript
const Didact = {
  createElement,
}

const element = Didact.createElement(
  "div",
  { id: "foo" },
  Didact.createElement("a", null, "bar"),
  Didact.createElement("b")
)
```



但是我们仍然想在这里使用JSX语法，怎么才能告诉babel用Didact的`createElement`代替React的呢？

如果我们有这样的注释，当babel翻译JSX时，它将使用我们定义的函数。

```javascript
/** @jsx Didact.createElement */
const element = (
  <div id="foo">
    <a>bar</a>
    <b />
  </div>
)
```

## 第二步：render函数

接下来，我们将实现我们的`render`函数

我们先只处理向DOM添加内容的部分，稍后我们将处理更新和删除的部分。

首先使用元素的`type`属性创建DOM节点，然后将新节点附加到容器中。

我们递归地为每个子元素做同样的事情。

我们还需要处理文本元素，如果元素类型是`TEXT_ELEMENT`，我们将创建一个文本节点而不是常规节点。

最后，我们需要将元素属性分配给节点。

就这样。我们现在有了一个可以将JSX呈现到DOM的库。

让我们尝试一下

```javascript
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
```

