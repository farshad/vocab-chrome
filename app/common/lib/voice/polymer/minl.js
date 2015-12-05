Polymer.Base._addFeature({
  _prepTemplate: function () {
    if (this._template === undefined) {
      this._template = Polymer.DomModule.import(this.is, 'template');
    }
    if (this._template && this._template.hasAttribute('is')) {
      this._warn(this._logf('_prepTemplate', 'top-level Polymer template ' + 'must not be a type-extension, found', this._template, 'Move inside simple <template>.'));
    }
    if (this._template && !this._template.content && window.HTMLTemplateElement && HTMLTemplateElement.decorate) {
      HTMLTemplateElement.decorate(this._template);
    }
  },
  _stampTemplate: function () {
    if (this._template) {
      this.root = this.instanceTemplate(this._template);
    }
  },
  instanceTemplate: function (template) {
    var dom = document.importNode(template._content || template.content, true);
    return dom;
  }
});
(function () {
  var baseAttachedCallback = Polymer.Base.attachedCallback;
  Polymer.Base._addFeature({
    _hostStack: [],
    ready: function () {
    },
    _registerHost: function (host) {
      this.dataHost = host = host || Polymer.Base._hostStack[Polymer.Base._hostStack.length - 1];
      if (host && host._clients) {
        host._clients.push(this);
      }
    },
    _beginHosting: function () {
      Polymer.Base._hostStack.push(this);
      if (!this._clients) {
        this._clients = [];
      }
    },
    _endHosting: function () {
      Polymer.Base._hostStack.pop();
    },
    _tryReady: function () {
      if (this._canReady()) {
        this._ready();
      }
    },
    _canReady: function () {
      return !this.dataHost || this.dataHost._clientsReadied;
    },
    _ready: function () {
      this._beforeClientsReady();
      if (this._template) {
        this._setupRoot();
        this._readyClients();
      }
      this._clientsReadied = true;
      this._clients = null;
      this._afterClientsReady();
      this._readySelf();
    },
    _readyClients: function () {
      this._beginDistribute();
      var c$ = this._clients;
      if (c$) {
        for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
          c._ready();
        }
      }
      this._finishDistribute();
    },
    _readySelf: function () {
      this._doBehavior('ready');
      this._readied = true;
      if (this._attachedPending) {
        this._attachedPending = false;
        this.attachedCallback();
      }
    },
    _beforeClientsReady: function () {
    },
    _afterClientsReady: function () {
    },
    _beforeAttached: function () {
    },
    attachedCallback: function () {
      if (this._readied) {
        this._beforeAttached();
        baseAttachedCallback.call(this);
      } else {
        this._attachedPending = true;
      }
    }
  });
}());
Polymer.ArraySplice = function () {
  function newSplice(index, removed, addedCount) {
    return {
      index: index,
      removed: removed,
      addedCount: addedCount
    };
  }
  var EDIT_LEAVE = 0;
  var EDIT_UPDATE = 1;
  var EDIT_ADD = 2;
  var EDIT_DELETE = 3;
  function ArraySplice() {
  }
  ArraySplice.prototype = {
    calcEditDistances: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
      var rowCount = oldEnd - oldStart + 1;
      var columnCount = currentEnd - currentStart + 1;
      var distances = new Array(rowCount);
      for (var i = 0; i < rowCount; i++) {
        distances[i] = new Array(columnCount);
        distances[i][0] = i;
      }
      for (var j = 0; j < columnCount; j++)
        distances[0][j] = j;
      for (var i = 1; i < rowCount; i++) {
        for (var j = 1; j < columnCount; j++) {
          if (this.equals(current[currentStart + j - 1], old[oldStart + i - 1]))
            distances[i][j] = distances[i - 1][j - 1];
          else {
            var north = distances[i - 1][j] + 1;
            var west = distances[i][j - 1] + 1;
            distances[i][j] = north < west ? north : west;
          }
        }
      }
      return distances;
    },
    spliceOperationsFromEditDistances: function (distances) {
      var i = distances.length - 1;
      var j = distances[0].length - 1;
      var current = distances[i][j];
      var edits = [];
      while (i > 0 || j > 0) {
        if (i == 0) {
          edits.push(EDIT_ADD);
          j--;
          continue;
        }
        if (j == 0) {
          edits.push(EDIT_DELETE);
          i--;
          continue;
        }
        var northWest = distances[i - 1][j - 1];
        var west = distances[i - 1][j];
        var north = distances[i][j - 1];
        var min;
        if (west < north)
          min = west < northWest ? west : northWest;
        else
          min = north < northWest ? north : northWest;
        if (min == northWest) {
          if (northWest == current) {
            edits.push(EDIT_LEAVE);
          } else {
            edits.push(EDIT_UPDATE);
            current = northWest;
          }
          i--;
          j--;
        } else if (min == west) {
          edits.push(EDIT_DELETE);
          i--;
          current = west;
        } else {
          edits.push(EDIT_ADD);
          j--;
          current = north;
        }
      }
      edits.reverse();
      return edits;
    },
    calcSplices: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
      var prefixCount = 0;
      var suffixCount = 0;
      var minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart);
      if (currentStart == 0 && oldStart == 0)
        prefixCount = this.sharedPrefix(current, old, minLength);
      if (currentEnd == current.length && oldEnd == old.length)
        suffixCount = this.sharedSuffix(current, old, minLength - prefixCount);
      currentStart += prefixCount;
      oldStart += prefixCount;
      currentEnd -= suffixCount;
      oldEnd -= suffixCount;
      if (currentEnd - currentStart == 0 && oldEnd - oldStart == 0)
        return [];
      if (currentStart == currentEnd) {
        var splice = newSplice(currentStart, [], 0);
        while (oldStart < oldEnd)
          splice.removed.push(old[oldStart++]);
        return [splice];
      } else if (oldStart == oldEnd)
        return [newSplice(currentStart, [], currentEnd - currentStart)];
      var ops = this.spliceOperationsFromEditDistances(this.calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd));
      var splice = undefined;
      var splices = [];
      var index = currentStart;
      var oldIndex = oldStart;
      for (var i = 0; i < ops.length; i++) {
        switch (ops[i]) {
          case EDIT_LEAVE:
            if (splice) {
              splices.push(splice);
              splice = undefined;
            }
            index++;
            oldIndex++;
            break;
          case EDIT_UPDATE:
            if (!splice)
              splice = newSplice(index, [], 0);
            splice.addedCount++;
            index++;
            splice.removed.push(old[oldIndex]);
            oldIndex++;
            break;
          case EDIT_ADD:
            if (!splice)
              splice = newSplice(index, [], 0);
            splice.addedCount++;
            index++;
            break;
          case EDIT_DELETE:
            if (!splice)
              splice = newSplice(index, [], 0);
            splice.removed.push(old[oldIndex]);
            oldIndex++;
            break;
        }
      }
      if (splice) {
        splices.push(splice);
      }
      return splices;
    },
    sharedPrefix: function (current, old, searchLength) {
      for (var i = 0; i < searchLength; i++)
        if (!this.equals(current[i], old[i]))
          return i;
      return searchLength;
    },
    sharedSuffix: function (current, old, searchLength) {
      var index1 = current.length;
      var index2 = old.length;
      var count = 0;
      while (count < searchLength && this.equals(current[--index1], old[--index2]))
        count++;
      return count;
    },
    calculateSplices: function (current, previous) {
      return this.calcSplices(current, 0, current.length, previous, 0, previous.length);
    },
    equals: function (currentValue, previousValue) {
      return currentValue === previousValue;
    }
  };
  return new ArraySplice();
}();
Polymer.domInnerHTML = function () {
  var escapeAttrRegExp = /[&\u00A0"]/g;
  var escapeDataRegExp = /[&\u00A0<>]/g;
  function escapeReplace(c) {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case '\xA0':
        return '&nbsp;';
    }
  }
  function escapeAttr(s) {
    return s.replace(escapeAttrRegExp, escapeReplace);
  }
  function escapeData(s) {
    return s.replace(escapeDataRegExp, escapeReplace);
  }
  function makeSet(arr) {
    var set = {};
    for (var i = 0; i < arr.length; i++) {
      set[arr[i]] = true;
    }
    return set;
  }
  var voidElements = makeSet([
    'area',
    'base',
    'br',
    'col',
    'command',
    'embed',
    'hr',
    'img',
    'input',
    'keygen',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr'
  ]);
  var plaintextParents = makeSet([
    'style',
    'script',
    'xmp',
    'iframe',
    'noembed',
    'noframes',
    'plaintext',
    'noscript'
  ]);
  function getOuterHTML(node, parentNode, composed) {
    switch (node.nodeType) {
      case Node.ELEMENT_NODE:
        var tagName = node.localName;
        var s = '<' + tagName;
        var attrs = node.attributes;
        for (var i = 0, attr; attr = attrs[i]; i++) {
          s += ' ' + attr.name + '="' + escapeAttr(attr.value) + '"';
        }
        s += '>';
        if (voidElements[tagName]) {
          return s;
        }
        return s + getInnerHTML(node, composed) + '</' + tagName + '>';
      case Node.TEXT_NODE:
        var data = node.data;
        if (parentNode && plaintextParents[parentNode.localName]) {
          return data;
        }
        return escapeData(data);
      case Node.COMMENT_NODE:
        return '<!--' + node.data + '-->';
      default:
        console.error(node);
        throw new Error('not implemented');
    }
  }
  function getInnerHTML(node, composed) {
    if (node instanceof HTMLTemplateElement)
      node = node.content;
    var s = '';
    var c$ = Polymer.dom(node).childNodes;
    c$ = composed ? node._composedChildren : c$;
    for (var i = 0, l = c$.length, child; i < l && (child = c$[i]); i++) {
      s += getOuterHTML(child, node, composed);
    }
    return s;
  }
  return { getInnerHTML: getInnerHTML };
}();
Polymer.DomApi = function () {
  'use strict';
  var Settings = Polymer.Settings;
  var getInnerHTML = Polymer.domInnerHTML.getInnerHTML;
  var nativeInsertBefore = Element.prototype.insertBefore;
  var nativeRemoveChild = Element.prototype.removeChild;
  var nativeAppendChild = Element.prototype.appendChild;
  var nativeCloneNode = Element.prototype.cloneNode;
  var nativeImportNode = Document.prototype.importNode;
  var needsToWrap = Settings.hasShadow && !Settings.nativeShadow;
  var wrap = window.wrap ? window.wrap : function (node) {
    return node;
  };
  var DomApi = function (node) {
    this.node = needsToWrap ? wrap(node) : node;
    if (this.patch) {
      this.patch();
    }
  };
  DomApi.prototype = {
    flush: function () {
      Polymer.dom.flush();
    },
    deepContains: function (node) {
      if (this.node.contains(node)) {
        return true;
      }
      var n = node;
      var wrappedDocument = wrap(document);
      while (n && n !== wrappedDocument && n !== this.node) {
        n = Polymer.dom(n).parentNode || n.host;
      }
      return n === this.node;
    },
    _lazyDistribute: function (host) {
      if (host.shadyRoot && host.shadyRoot._distributionClean) {
        host.shadyRoot._distributionClean = false;
        Polymer.dom.addDebouncer(host.debounce('_distribute', host._distributeContent));
      }
    },
    appendChild: function (node) {
      return this._addNode(node);
    },
    insertBefore: function (node, ref_node) {
      return this._addNode(node, ref_node);
    },
    _addNode: function (node, ref_node) {
      this._removeNodeFromParent(node);
      var addedInsertionPoint;
      var root = this.getOwnerRoot();
      if (root) {
        addedInsertionPoint = this._maybeAddInsertionPoint(node, this.node);
      }
      if (this._nodeHasLogicalChildren(this.node)) {
        if (ref_node) {
          var children = this.childNodes;
          var index = children.indexOf(ref_node);
          if (index < 0) {
            throw Error('The ref_node to be inserted before is not a child ' + 'of this node');
          }
        }
        this._addLogicalInfo(node, this.node, index);
      }
      this._addNodeToHost(node);
      if (!this._maybeDistribute(node, this.node) && !this._tryRemoveUndistributedNode(node)) {
        if (ref_node) {
          ref_node = ref_node.localName === CONTENT ? this._firstComposedNode(ref_node) : ref_node;
        }
        var container = this.node._isShadyRoot ? this.node.host : this.node;
        addToComposedParent(container, node, ref_node);
        if (ref_node) {
          nativeInsertBefore.call(container, node, ref_node);
        } else {
          nativeAppendChild.call(container, node);
        }
      }
      if (addedInsertionPoint) {
        this._updateInsertionPoints(root.host);
      }
      this.notifyObserver();
      return node;
    },
    removeChild: function (node) {
      if (factory(node).parentNode !== this.node) {
        console.warn('The node to be removed is not a child of this node', node);
      }
      this._removeNodeFromHost(node);
      if (!this._maybeDistribute(node, this.node)) {
        var container = this.node._isShadyRoot ? this.node.host : this.node;
        if (container === node.parentNode) {
          removeFromComposedParent(container, node);
          nativeRemoveChild.call(container, node);
        }
      }
      this.notifyObserver();
      return node;
    },
    replaceChild: function (node, ref_node) {
      this.insertBefore(node, ref_node);
      this.removeChild(ref_node);
      return node;
    },
    _hasCachedOwnerRoot: function (node) {
      return Boolean(node._ownerShadyRoot !== undefined);
    },
    getOwnerRoot: function () {
      return this._ownerShadyRootForNode(this.node);
    },
    _ownerShadyRootForNode: function (node) {
      if (!node) {
        return;
      }
      if (node._ownerShadyRoot === undefined) {
        var root;
        if (node._isShadyRoot) {
          root = node;
        } else {
          var parent = Polymer.dom(node).parentNode;
          if (parent) {
            root = parent._isShadyRoot ? parent : this._ownerShadyRootForNode(parent);
          } else {
            root = null;
          }
        }
        node._ownerShadyRoot = root;
      }
      return node._ownerShadyRoot;
    },
    _maybeDistribute: function (node, parent) {
      var fragContent = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent && Polymer.dom(node).querySelector(CONTENT);
      var wrappedContent = fragContent && Polymer.dom(fragContent).parentNode.nodeType !== Node.DOCUMENT_FRAGMENT_NODE;
      var hasContent = fragContent || node.localName === CONTENT;
      if (hasContent) {
        var root = this._ownerShadyRootForNode(parent);
        if (root) {
          var host = root.host;
          this._lazyDistribute(host);
        }
      }
      var parentNeedsDist = this._parentNeedsDistribution(parent);
      if (parentNeedsDist) {
        this._lazyDistribute(parent);
      }
      return parentNeedsDist || hasContent && !wrappedContent;
    },
    _maybeAddInsertionPoint: function (node, parent) {
      var added;
      if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent) {
        var c$ = factory(node).querySelectorAll(CONTENT);
        for (var i = 0, n, np, na; i < c$.length && (n = c$[i]); i++) {
          np = factory(n).parentNode;
          if (np === node) {
            np = parent;
          }
          na = this._maybeAddInsertionPoint(n, np);
          added = added || na;
        }
      } else if (node.localName === CONTENT) {
        saveLightChildrenIfNeeded(parent);
        saveLightChildrenIfNeeded(node);
        added = true;
      }
      return added;
    },
    _tryRemoveUndistributedNode: function (node) {
      if (this.node.shadyRoot) {
        var parent = getComposedParent(node);
        if (parent) {
          nativeRemoveChild.call(parent, node);
        }
        return true;
      }
    },
    _updateInsertionPoints: function (host) {
      var i$ = host.shadyRoot._insertionPoints = factory(host.shadyRoot).querySelectorAll(CONTENT);
      for (var i = 0, c; i < i$.length; i++) {
        c = i$[i];
        saveLightChildrenIfNeeded(c);
        saveLightChildrenIfNeeded(factory(c).parentNode);
      }
    },
    _nodeHasLogicalChildren: function (node) {
      return Boolean(node._lightChildren !== undefined);
    },
    _parentNeedsDistribution: function (parent) {
      return parent && parent.shadyRoot && hasInsertionPoint(parent.shadyRoot);
    },
    _removeNodeFromParent: function (node) {
      var parent = node._lightParent || node.parentNode;
      if (parent && hasDomApi(parent)) {
        factory(parent).notifyObserver();
      }
      this._removeNodeFromHost(node, true);
    },
    _removeNodeFromHost: function (node, ensureComposedRemoval) {
      var hostNeedsDist;
      var root;
      var parent = node._lightParent;
      if (parent) {
        factory(node)._distributeParent();
        root = this._ownerShadyRootForNode(node);
        if (root) {
          root.host._elementRemove(node);
          hostNeedsDist = this._removeDistributedChildren(root, node);
        }
        this._removeLogicalInfo(node, parent);
      }
      this._removeOwnerShadyRoot(node);
      if (root && hostNeedsDist) {
        this._updateInsertionPoints(root.host);
        this._lazyDistribute(root.host);
      } else if (ensureComposedRemoval) {
        removeFromComposedParent(getComposedParent(node), node);
      }
    },
    _removeDistributedChildren: function (root, container) {
      var hostNeedsDist;
      var ip$ = root._insertionPoints;
      for (var i = 0; i < ip$.length; i++) {
        var content = ip$[i];
        if (this._contains(container, content)) {
          var dc$ = factory(content).getDistributedNodes();
          for (var j = 0; j < dc$.length; j++) {
            hostNeedsDist = true;
            var node = dc$[j];
            var parent = node.parentNode;
            if (parent) {
              removeFromComposedParent(parent, node);
              nativeRemoveChild.call(parent, node);
            }
          }
        }
      }
      return hostNeedsDist;
    },
    _contains: function (container, node) {
      while (node) {
        if (node == container) {
          return true;
        }
        node = factory(node).parentNode;
      }
    },
    _addNodeToHost: function (node) {
      var root = this.getOwnerRoot();
      if (root) {
        root.host._elementAdd(node);
      }
    },
    _addLogicalInfo: function (node, container, index) {
      var children = factory(container).childNodes;
      index = index === undefined ? children.length : index;
      if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        var c$ = arrayCopyChildNodes(node);
        for (var i = 0, n; i < c$.length && (n = c$[i]); i++) {
          children.splice(index++, 0, n);
          n._lightParent = container;
        }
      } else {
        children.splice(index, 0, node);
        node._lightParent = container;
      }
    },
    _removeLogicalInfo: function (node, container) {
      var children = factory(container).childNodes;
      var index = children.indexOf(node);
      if (index < 0 || container !== node._lightParent) {
        throw Error('The node to be removed is not a child of this node');
      }
      children.splice(index, 1);
      node._lightParent = null;
    },
    _removeOwnerShadyRoot: function (node) {
      if (this._hasCachedOwnerRoot(node)) {
        var c$ = factory(node).childNodes;
        for (var i = 0, l = c$.length, n; i < l && (n = c$[i]); i++) {
          this._removeOwnerShadyRoot(n);
        }
      }
      node._ownerShadyRoot = undefined;
    },
    _firstComposedNode: function (content) {
      var n$ = factory(content).getDistributedNodes();
      for (var i = 0, l = n$.length, n, p$; i < l && (n = n$[i]); i++) {
        p$ = factory(n).getDestinationInsertionPoints();
        if (p$[p$.length - 1] === content) {
          return n;
        }
      }
    },
    querySelector: function (selector) {
      return this.querySelectorAll(selector)[0];
    },
    querySelectorAll: function (selector) {
      return this._query(function (n) {
        return matchesSelector.call(n, selector);
      }, this.node);
    },
    _query: function (matcher, node) {
      node = node || this.node;
      var list = [];
      this._queryElements(factory(node).childNodes, matcher, list);
      return list;
    },
    _queryElements: function (elements, matcher, list) {
      for (var i = 0, l = elements.length, c; i < l && (c = elements[i]); i++) {
        if (c.nodeType === Node.ELEMENT_NODE) {
          this._queryElement(c, matcher, list);
        }
      }
    },
    _queryElement: function (node, matcher, list) {
      if (matcher(node)) {
        list.push(node);
      }
      this._queryElements(factory(node).childNodes, matcher, list);
    },
    getDestinationInsertionPoints: function () {
      return this.node._destinationInsertionPoints || [];
    },
    getDistributedNodes: function () {
      return this.node._distributedNodes || [];
    },
    queryDistributedElements: function (selector) {
      var c$ = this.getEffectiveChildNodes();
      var list = [];
      for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
        if (c.nodeType === Node.ELEMENT_NODE && matchesSelector.call(c, selector)) {
          list.push(c);
        }
      }
      return list;
    },
    getEffectiveChildNodes: function () {
      var list = [];
      var c$ = this.childNodes;
      for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
        if (c.localName === CONTENT) {
          var d$ = factory(c).getDistributedNodes();
          for (var j = 0; j < d$.length; j++) {
            list.push(d$[j]);
          }
        } else {
          list.push(c);
        }
      }
      return list;
    },
    _clear: function () {
      while (this.childNodes.length) {
        this.removeChild(this.childNodes[0]);
      }
    },
    setAttribute: function (name, value) {
      this.node.setAttribute(name, value);
      this._distributeParent();
    },
    removeAttribute: function (name) {
      this.node.removeAttribute(name);
      this._distributeParent();
    },
    _distributeParent: function () {
      if (this._parentNeedsDistribution(this.parentNode)) {
        this._lazyDistribute(this.parentNode);
      }
    },
    cloneNode: function (deep) {
      var n = nativeCloneNode.call(this.node, false);
      if (deep) {
        var c$ = this.childNodes;
        var d = factory(n);
        for (var i = 0, nc; i < c$.length; i++) {
          nc = factory(c$[i]).cloneNode(true);
          d.appendChild(nc);
        }
      }
      return n;
    },
    importNode: function (externalNode, deep) {
      var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
      var n = nativeImportNode.call(doc, externalNode, false);
      if (deep) {
        var c$ = factory(externalNode).childNodes;
        var d = factory(n);
        for (var i = 0, nc; i < c$.length; i++) {
          nc = factory(doc).importNode(c$[i], true);
          d.appendChild(nc);
        }
      }
      return n;
    },
    observeNodes: function (callback) {
      if (callback) {
        if (!this.observer) {
          this.observer = this.node.localName === CONTENT ? new DomApi.DistributedNodesObserver(this) : new DomApi.EffectiveNodesObserver(this);
        }
        return this.observer.addListener(callback);
      }
    },
    unobserveNodes: function (handle) {
      if (this.observer) {
        this.observer.removeListener(handle);
      }
    },
    notifyObserver: function () {
      if (this.observer) {
        this.observer.notify();
      }
    }
  };
  if (!Settings.useShadow) {
    Object.defineProperties(DomApi.prototype, {
      childNodes: {
        get: function () {
          var c$ = getLightChildren(this.node);
          return Array.isArray(c$) ? c$ : arrayCopyChildNodes(this.node);
        },
        configurable: true
      },
      children: {
        get: function () {
          return Array.prototype.filter.call(this.childNodes, function (n) {
            return n.nodeType === Node.ELEMENT_NODE;
          });
        },
        configurable: true
      },
      parentNode: {
        get: function () {
          return this.node._lightParent || getComposedParent(this.node);
        },
        configurable: true
      },
      firstChild: {
        get: function () {
          return this.childNodes[0];
        },
        configurable: true
      },
      lastChild: {
        get: function () {
          var c$ = this.childNodes;
          return c$[c$.length - 1];
        },
        configurable: true
      },
      nextSibling: {
        get: function () {
          var c$ = this.parentNode && factory(this.parentNode).childNodes;
          if (c$) {
            return c$[Array.prototype.indexOf.call(c$, this.node) + 1];
          }
        },
        configurable: true
      },
      previousSibling: {
        get: function () {
          var c$ = this.parentNode && factory(this.parentNode).childNodes;
          if (c$) {
            return c$[Array.prototype.indexOf.call(c$, this.node) - 1];
          }
        },
        configurable: true
      },
      firstElementChild: {
        get: function () {
          return this.children[0];
        },
        configurable: true
      },
      lastElementChild: {
        get: function () {
          var c$ = this.children;
          return c$[c$.length - 1];
        },
        configurable: true
      },
      nextElementSibling: {
        get: function () {
          var c$ = this.parentNode && factory(this.parentNode).children;
          if (c$) {
            return c$[Array.prototype.indexOf.call(c$, this.node) + 1];
          }
        },
        configurable: true
      },
      previousElementSibling: {
        get: function () {
          var c$ = this.parentNode && factory(this.parentNode).children;
          if (c$) {
            return c$[Array.prototype.indexOf.call(c$, this.node) - 1];
          }
        },
        configurable: true
      },
      textContent: {
        get: function () {
          var nt = this.node.nodeType;
          if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
            return this.node.textContent;
          } else {
            var tc = [];
            for (var i = 0, cn = this.childNodes, c; c = cn[i]; i++) {
              if (c.nodeType !== Node.COMMENT_NODE) {
                tc.push(c.textContent);
              }
            }
            return tc.join('');
          }
        },
        set: function (text) {
          var nt = this.node.nodeType;
          if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
            this.node.textContent = text;
          } else {
            this._clear();
            if (text) {
              this.appendChild(document.createTextNode(text));
            }
          }
        },
        configurable: true
      },
      innerHTML: {
        get: function () {
          var nt = this.node.nodeType;
          if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
            return null;
          } else {
            return getInnerHTML(this.node);
          }
        },
        set: function (text) {
          var nt = this.node.nodeType;
          if (nt !== Node.TEXT_NODE || nt !== Node.COMMENT_NODE) {
            this._clear();
            var d = document.createElement('div');
            d.innerHTML = text;
            var c$ = arrayCopyChildNodes(d);
            for (var i = 0; i < c$.length; i++) {
              this.appendChild(c$[i]);
            }
          }
        },
        configurable: true
      }
    });
    DomApi.prototype._getComposedInnerHTML = function () {
      return getInnerHTML(this.node, true);
    };
  } else {
    var forwardMethods = function (m$) {
      for (var i = 0; i < m$.length; i++) {
        forwardMethod(m$[i]);
      }
    };
    var forwardMethod = function (method) {
      DomApi.prototype[method] = function () {
        return this.node[method].apply(this.node, arguments);
      };
    };
    forwardMethods([
      'cloneNode',
      'appendChild',
      'insertBefore',
      'removeChild',
      'replaceChild'
    ]);
    DomApi.prototype.querySelectorAll = function (selector) {
      return arrayCopy(this.node.querySelectorAll(selector));
    };
    DomApi.prototype.getOwnerRoot = function () {
      var n = this.node;
      while (n) {
        if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE && n.host) {
          return n;
        }
        n = n.parentNode;
      }
    };
    DomApi.prototype.importNode = function (externalNode, deep) {
      var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
      return doc.importNode(externalNode, deep);
    };
    DomApi.prototype.getDestinationInsertionPoints = function () {
      var n$ = this.node.getDestinationInsertionPoints && this.node.getDestinationInsertionPoints();
      return n$ ? arrayCopy(n$) : [];
    };
    DomApi.prototype.getDistributedNodes = function () {
      var n$ = this.node.getDistributedNodes && this.node.getDistributedNodes();
      return n$ ? arrayCopy(n$) : [];
    };
    DomApi.prototype._distributeParent = function () {
    };
    Object.defineProperties(DomApi.prototype, {
      childNodes: {
        get: function () {
          return arrayCopyChildNodes(this.node);
        },
        configurable: true
      },
      children: {
        get: function () {
          return arrayCopyChildren(this.node);
        },
        configurable: true
      },
      textContent: {
        get: function () {
          return this.node.textContent;
        },
        set: function (value) {
          return this.node.textContent = value;
        },
        configurable: true
      },
      innerHTML: {
        get: function () {
          return this.node.innerHTML;
        },
        set: function (value) {
          return this.node.innerHTML = value;
        },
        configurable: true
      }
    });
    var forwardProperties = function (f$) {
      for (var i = 0; i < f$.length; i++) {
        forwardProperty(f$[i]);
      }
    };
    var forwardProperty = function (name) {
      Object.defineProperty(DomApi.prototype, name, {
        get: function () {
          return this.node[name];
        },
        configurable: true
      });
    };
    forwardProperties([
      'parentNode',
      'firstChild',
      'lastChild',
      'nextSibling',
      'previousSibling',
      'firstElementChild',
      'lastElementChild',
      'nextElementSibling',
      'previousElementSibling'
    ]);
  }
  var CONTENT = 'content';
  function factory(node, patch) {
    node = node || document;
    if (!node.__domApi) {
      node.__domApi = new DomApi(node, patch);
    }
    return node.__domApi;
  }
  ;
  function hasDomApi(node) {
    return Boolean(node.__domApi);
  }
  ;
  Polymer.dom = function (obj, patch) {
    if (obj instanceof Event) {
      return Polymer.EventApi.factory(obj);
    } else {
      return factory(obj, patch);
    }
  };
  function getLightChildren(node) {
    var children = node._lightChildren;
    return children ? children : node.childNodes;
  }
  function getComposedChildren(node) {
    if (!node._composedChildren) {
      node._composedChildren = arrayCopyChildNodes(node);
    }
    return node._composedChildren;
  }
  function addToComposedParent(parent, node, ref_node) {
    var children = getComposedChildren(parent);
    var i = ref_node ? children.indexOf(ref_node) : -1;
    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      var fragChildren = getComposedChildren(node);
      for (var j = 0; j < fragChildren.length; j++) {
        addNodeToComposedChildren(fragChildren[j], parent, children, i + j);
      }
      node._composedChildren = null;
    } else {
      addNodeToComposedChildren(node, parent, children, i);
    }
  }
  function getComposedParent(node) {
    return node.__patched ? node._composedParent : node.parentNode;
  }
  function addNodeToComposedChildren(node, parent, children, i) {
    node._composedParent = parent;
    children.splice(i >= 0 ? i : children.length, 0, node);
  }
  function removeFromComposedParent(parent, node) {
    node._composedParent = null;
    if (parent) {
      var children = getComposedChildren(parent);
      var i = children.indexOf(node);
      if (i >= 0) {
        children.splice(i, 1);
      }
    }
  }
  function saveLightChildrenIfNeeded(node) {
    if (!node._lightChildren) {
      var c$ = arrayCopyChildNodes(node);
      for (var i = 0, l = c$.length, child; i < l && (child = c$[i]); i++) {
        child._lightParent = child._lightParent || node;
      }
      node._lightChildren = c$;
    }
  }
  function arrayCopyChildNodes(parent) {
    var copy = [], i = 0;
    for (var n = parent.firstChild; n; n = n.nextSibling) {
      copy[i++] = n;
    }
    return copy;
  }
  function arrayCopyChildren(parent) {
    var copy = [], i = 0;
    for (var n = parent.firstElementChild; n; n = n.nextElementSibling) {
      copy[i++] = n;
    }
    return copy;
  }
  function arrayCopy(a$) {
    var l = a$.length;
    var copy = new Array(l);
    for (var i = 0; i < l; i++) {
      copy[i] = a$[i];
    }
    return copy;
  }
  function hasInsertionPoint(root) {
    return Boolean(root && root._insertionPoints.length);
  }
  var p = Element.prototype;
  var matchesSelector = p.matches || p.matchesSelector || p.mozMatchesSelector || p.msMatchesSelector || p.oMatchesSelector || p.webkitMatchesSelector;
  return {
    getLightChildren: getLightChildren,
    getComposedParent: getComposedParent,
    getComposedChildren: getComposedChildren,
    removeFromComposedParent: removeFromComposedParent,
    saveLightChildrenIfNeeded: saveLightChildrenIfNeeded,
    matchesSelector: matchesSelector,
    hasInsertionPoint: hasInsertionPoint,
    ctor: DomApi,
    factory: factory,
    hasDomApi: hasDomApi,
    arrayCopy: arrayCopy,
    arrayCopyChildNodes: arrayCopyChildNodes,
    arrayCopyChildren: arrayCopyChildren,
    wrap: wrap
  };
}();
Polymer.Base.extend(Polymer.dom, {
  _flushGuard: 0,
  _FLUSH_MAX: 100,
  _needsTakeRecords: !Polymer.Settings.useNativeCustomElements,
  _debouncers: [],
  _staticFlushList: [],
  _finishDebouncer: null,
  flush: function () {
    this._flushGuard = 0;
    this._prepareFlush();
    while (this._debouncers.length && this._flushGuard < this._FLUSH_MAX) {
      for (var i = 0; i < this._debouncers.length; i++) {
        this._debouncers[i].complete();
      }
      if (this._finishDebouncer) {
        this._finishDebouncer.complete();
      }
      this._prepareFlush();
      this._flushGuard++;
    }
    if (this._flushGuard >= this._FLUSH_MAX) {
      console.warn('Polymer.dom.flush aborted. Flush may not be complete.');
    }
  },
  _prepareFlush: function () {
    if (this._needsTakeRecords) {
      CustomElements.takeRecords();
    }
    for (var i = 0; i < this._staticFlushList.length; i++) {
      this._staticFlushList[i]();
    }
  },
  addStaticFlush: function (fn) {
    this._staticFlushList.push(fn);
  },
  removeStaticFlush: function (fn) {
    var i = this._staticFlushList.indexOf(fn);
    if (i >= 0) {
      this._staticFlushList.splice(i, 1);
    }
  },
  addDebouncer: function (debouncer) {
    this._debouncers.push(debouncer);
    this._finishDebouncer = Polymer.Debounce(this._finishDebouncer, this._finishFlush);
  },
  _finishFlush: function () {
    Polymer.dom._debouncers = [];
  }
});
Polymer.EventApi = function () {
  'use strict';
  var DomApi = Polymer.DomApi.ctor;
  var Settings = Polymer.Settings;
  DomApi.Event = function (event) {
    this.event = event;
  };
  if (Settings.useShadow) {
    DomApi.Event.prototype = {
      get rootTarget() {
        return this.event.path[0];
      },
      get localTarget() {
        return this.event.target;
      },
      get path() {
        return this.event.path;
      }
    };
  } else {
    DomApi.Event.prototype = {
      get rootTarget() {
        return this.event.target;
      },
      get localTarget() {
        var current = this.event.currentTarget;
        var currentRoot = current && Polymer.dom(current).getOwnerRoot();
        var p$ = this.path;
        for (var i = 0; i < p$.length; i++) {
          if (Polymer.dom(p$[i]).getOwnerRoot() === currentRoot) {
            return p$[i];
          }
        }
      },
      get path() {
        if (!this.event._path) {
          var path = [];
          var o = this.rootTarget;
          while (o) {
            path.push(o);
            o = Polymer.dom(o).parentNode || o.host;
          }
          path.push(window);
          this.event._path = path;
        }
        return this.event._path;
      }
    };
  }
  var factory = function (event) {
    if (!event.__eventApi) {
      event.__eventApi = new DomApi.Event(event);
    }
    return event.__eventApi;
  };
  return { factory: factory };
}();
(function () {
  'use strict';
  var DomApi = Polymer.DomApi.ctor;
  Object.defineProperty(DomApi.prototype, 'classList', {
    get: function () {
      if (!this._classList) {
        this._classList = new DomApi.ClassList(this);
      }
      return this._classList;
    },
    configurable: true
  });
  DomApi.ClassList = function (host) {
    this.domApi = host;
    this.node = host.node;
  };
  DomApi.ClassList.prototype = {
    add: function () {
      this.node.classList.add.apply(this.node.classList, arguments);
      this.domApi._distributeParent();
    },
    remove: function () {
      this.node.classList.remove.apply(this.node.classList, arguments);
      this.domApi._distributeParent();
    },
    toggle: function () {
      this.node.classList.toggle.apply(this.node.classList, arguments);
      this.domApi._distributeParent();
    },
    contains: function () {
      return this.node.classList.contains.apply(this.node.classList, arguments);
    }
  };
}());
(function () {
  'use strict';
  var DomApi = Polymer.DomApi.ctor;
  var Settings = Polymer.Settings;
  var hasDomApi = Polymer.DomApi.hasDomApi;
  DomApi.EffectiveNodesObserver = function (domApi) {
    this.domApi = domApi;
    this.node = this.domApi.node;
    this._listeners = [];
  };
  DomApi.EffectiveNodesObserver.prototype = {
    addListener: function (callback) {
      if (!this._isSetup) {
        this._setup();
        this._isSetup = true;
      }
      var listener = {
        fn: callback,
        _nodes: []
      };
      this._listeners.push(listener);
      this._scheduleNotify();
      return listener;
    },
    removeListener: function (handle) {
      var i = this._listeners.indexOf(handle);
      if (i >= 0) {
        this._listeners.splice(i, 1);
        handle._nodes = [];
      }
      if (!this._hasListeners()) {
        this._cleanup();
        this._isSetup = false;
      }
    },
    _setup: function () {
      this._observeContentElements(this.domApi.childNodes);
    },
    _cleanup: function () {
      this._unobserveContentElements(this.domApi.childNodes);
    },
    _hasListeners: function () {
      return Boolean(this._listeners.length);
    },
    _scheduleNotify: function () {
      if (this._debouncer) {
        this._debouncer.stop();
      }
      this._debouncer = Polymer.Debounce(this._debouncer, this._notify);
      this._debouncer.context = this;
      Polymer.dom.addDebouncer(this._debouncer);
    },
    notify: function () {
      if (this._hasListeners()) {
        this._scheduleNotify();
      }
    },
    _notify: function (mxns) {
      this._beforeCallListeners();
      this._callListeners();
    },
    _beforeCallListeners: function () {
      this._updateContentElements();
    },
    _updateContentElements: function () {
      this._observeContentElements(this.domApi.childNodes);
    },
    _observeContentElements: function (elements) {
      for (var i = 0, n; i < elements.length && (n = elements[i]); i++) {
        if (this._isContent(n)) {
          n.__observeNodesMap = n.__observeNodesMap || new WeakMap();
          if (!n.__observeNodesMap.has(this)) {
            n.__observeNodesMap.set(this, this._observeContent(n));
          }
        }
      }
    },
    _observeContent: function (content) {
      var self = this;
      var h = Polymer.dom(content).observeNodes(function () {
        self._scheduleNotify();
      });
      h._avoidChangeCalculation = true;
      return h;
    },
    _unobserveContentElements: function (elements) {
      for (var i = 0, n, h; i < elements.length && (n = elements[i]); i++) {
        if (this._isContent(n)) {
          h = n.__observeNodesMap.get(this);
          if (h) {
            Polymer.dom(n).unobserveNodes(h);
            n.__observeNodesMap.delete(this);
          }
        }
      }
    },
    _isContent: function (node) {
      return node.localName === 'content';
    },
    _callListeners: function () {
      var o$ = this._listeners;
      var nodes = this._getEffectiveNodes();
      for (var i = 0, o; i < o$.length && (o = o$[i]); i++) {
        var info = this._generateListenerInfo(o, nodes);
        if (info || o._alwaysNotify) {
          this._callListener(o, info);
        }
      }
    },
    _getEffectiveNodes: function () {
      return this.domApi.getEffectiveChildNodes();
    },
    _generateListenerInfo: function (listener, newNodes) {
      if (listener._avoidChangeCalculation) {
        return true;
      }
      var oldNodes = listener._nodes;
      var info = {
        target: this.node,
        addedNodes: [],
        removedNodes: []
      };
      var splices = Polymer.ArraySplice.calculateSplices(newNodes, oldNodes);
      for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
        for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
          info.removedNodes.push(n);
        }
      }
      for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
        for (var j = s.index; j < s.index + s.addedCount; j++) {
          info.addedNodes.push(newNodes[j]);
        }
      }
      listener._nodes = newNodes;
      if (info.addedNodes.length || info.removedNodes.length) {
        return info;
      }
    },
    _callListener: function (listener, info) {
      return listener.fn.call(this.node, info);
    },
    enableShadowAttributeTracking: function () {
    }
  };
  if (Settings.useShadow) {
    var baseSetup = DomApi.EffectiveNodesObserver.prototype._setup;
    var baseCleanup = DomApi.EffectiveNodesObserver.prototype._cleanup;
    var beforeCallListeners = DomApi.EffectiveNodesObserver.prototype._beforeCallListeners;
    Polymer.Base.extend(DomApi.EffectiveNodesObserver.prototype, {
      _setup: function () {
        if (!this._observer) {
          var self = this;
          this._mutationHandler = function (mxns) {
            if (mxns && mxns.length) {
              self._scheduleNotify();
            }
          };
          this._observer = new MutationObserver(this._mutationHandler);
          this._boundFlush = function () {
            self._flush();
          };
          Polymer.dom.addStaticFlush(this._boundFlush);
          this._observer.observe(this.node, { childList: true });
        }
        baseSetup.call(this);
      },
      _cleanup: function () {
        this._observer.disconnect();
        this._observer = null;
        this._mutationHandler = null;
        Polymer.dom.removeStaticFlush(this._boundFlush);
        baseCleanup.call(this);
      },
      _flush: function () {
        if (this._observer) {
          this._mutationHandler(this._observer.takeRecords());
        }
      },
      enableShadowAttributeTracking: function () {
        if (this._observer) {
          this._makeContentListenersAlwaysNotify();
          this._observer.disconnect();
          this._observer.observe(this.node, {
            childList: true,
            attributes: true,
            subtree: true
          });
          var root = this.domApi.getOwnerRoot();
          var host = root && root.host;
          if (host && Polymer.dom(host).observer) {
            Polymer.dom(host).observer.enableShadowAttributeTracking();
          }
        }
      },
      _makeContentListenersAlwaysNotify: function () {
        for (var i = 0, h; i < this._listeners.length; i++) {
          h = this._listeners[i];
          h._alwaysNotify = h._isContentListener;
        }
      }
    });
  }
}());
(function () {
  'use strict';
  var DomApi = Polymer.DomApi.ctor;
  var Settings = Polymer.Settings;
  DomApi.DistributedNodesObserver = function (domApi) {
    DomApi.EffectiveNodesObserver.call(this, domApi);
  };
  DomApi.DistributedNodesObserver.prototype = Object.create(DomApi.EffectiveNodesObserver.prototype);
  Polymer.Base.extend(DomApi.DistributedNodesObserver.prototype, {
    _setup: function () {
    },
    _cleanup: function () {
    },
    _beforeCallListeners: function () {
    },
    _getEffectiveNodes: function () {
      return this.domApi.getDistributedNodes();
    }
  });
  if (Settings.useShadow) {
    Polymer.Base.extend(DomApi.DistributedNodesObserver.prototype, {
      _setup: function () {
        if (!this._observer) {
          var root = this.domApi.getOwnerRoot();
          var host = root && root.host;
          if (host) {
            var self = this;
            this._observer = Polymer.dom(host).observeNodes(function () {
              self._scheduleNotify();
            });
            this._observer._isContentListener = true;
            if (this._hasAttrSelect()) {
              Polymer.dom(host).observer.enableShadowAttributeTracking();
            }
          }
        }
      },
      _hasAttrSelect: function () {
        var select = this.node.getAttribute('select');
        return select && select.match(/[[.]+/);
      },
      _cleanup: function () {
        var root = this.domApi.getOwnerRoot();
        var host = root && root.host;
        if (host) {
          Polymer.dom(host).unobserveNodes(this._observer);
        }
        this._observer = null;
      }
    });
  }
}());
(function () {
  var hasDomApi = Polymer.DomApi.hasDomApi;
  Polymer.Base._addFeature({
    _prepShady: function () {
      this._useContent = this._useContent || Boolean(this._template);
    },
    _poolContent: function () {
      if (this._useContent) {
        saveLightChildrenIfNeeded(this);
      }
    },
    _setupRoot: function () {
      if (this._useContent) {
        this._createLocalRoot();
        if (!this.dataHost) {
          upgradeLightChildren(this._lightChildren);
        }
      }
    },
    _createLocalRoot: function () {
      this.shadyRoot = this.root;
      this.shadyRoot._distributionClean = false;
      this.shadyRoot._hasDistributed = false;
      this.shadyRoot._isShadyRoot = true;
      this.shadyRoot._dirtyRoots = [];
      var i$ = this.shadyRoot._insertionPoints = !this._notes || this._notes._hasContent ? this.shadyRoot.querySelectorAll('content') : [];
      saveLightChildrenIfNeeded(this.shadyRoot);
      for (var i = 0, c; i < i$.length; i++) {
        c = i$[i];
        saveLightChildrenIfNeeded(c);
        saveLightChildrenIfNeeded(c.parentNode);
      }
      this.shadyRoot.host = this;
    },
    get domHost() {
      var root = Polymer.dom(this).getOwnerRoot();
      return root && root.host;
    },
    distributeContent: function (updateInsertionPoints) {
      if (this.shadyRoot) {
        var dom = Polymer.dom(this);
        if (updateInsertionPoints) {
          dom._updateInsertionPoints(this);
        }
        var host = getTopDistributingHost(this);
        dom._lazyDistribute(host);
      }
    },
    _distributeContent: function () {
      if (this._useContent && !this.shadyRoot._distributionClean) {
        this._beginDistribute();
        this._distributeDirtyRoots();
        this._finishDistribute();
      }
    },
    _beginDistribute: function () {
      if (this._useContent && hasInsertionPoint(this.shadyRoot)) {
        this._resetDistribution();
        this._distributePool(this.shadyRoot, this._collectPool());
      }
    },
    _distributeDirtyRoots: function () {
      var c$ = this.shadyRoot._dirtyRoots;
      for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
        c._distributeContent();
      }
      this.shadyRoot._dirtyRoots = [];
    },
    _finishDistribute: function () {
      if (this._useContent) {
        this.shadyRoot._distributionClean = true;
        if (hasInsertionPoint(this.shadyRoot)) {
          this._composeTree();
          notifyContentObservers(this.shadyRoot);
        } else {
          if (!this.shadyRoot._hasDistributed) {
            this.textContent = '';
            this._composedChildren = null;
            this.appendChild(this.shadyRoot);
          } else {
            var children = this._composeNode(this);
            this._updateChildNodes(this, children);
          }
        }
        if (!this.shadyRoot._hasDistributed) {
          notifyInitialDistribution(this);
        }
        this.shadyRoot._hasDistributed = true;
      }
    },
    elementMatches: function (selector, node) {
      node = node || this;
      return matchesSelector.call(node, selector);
    },
    _resetDistribution: function () {
      var children = getLightChildren(this);
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (child._destinationInsertionPoints) {
          child._destinationInsertionPoints = undefined;
        }
        if (isInsertionPoint(child)) {
          clearDistributedDestinationInsertionPoints(child);
        }
      }
      var root = this.shadyRoot;
      var p$ = root._insertionPoints;
      for (var j = 0; j < p$.length; j++) {
        p$[j]._distributedNodes = [];
      }
    },
    _collectPool: function () {
      var pool = [];
      var children = getLightChildren(this);
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (isInsertionPoint(child)) {
          pool.push.apply(pool, child._distributedNodes);
        } else {
          pool.push(child);
        }
      }
      return pool;
    },
    _distributePool: function (node, pool) {
      var p$ = node._insertionPoints;
      for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
        this._distributeInsertionPoint(p, pool);
        maybeRedistributeParent(p, this);
      }
    },
    _distributeInsertionPoint: function (content, pool) {
      var anyDistributed = false;
      for (var i = 0, l = pool.length, node; i < l; i++) {
        node = pool[i];
        if (!node) {
          continue;
        }
        if (this._matchesContentSelect(node, content)) {
          distributeNodeInto(node, content);
          pool[i] = undefined;
          anyDistributed = true;
        }
      }
      if (!anyDistributed) {
        var children = getLightChildren(content);
        for (var j = 0; j < children.length; j++) {
          distributeNodeInto(children[j], content);
        }
      }
    },
    _composeTree: function () {
      this._updateChildNodes(this, this._composeNode(this));
      var p$ = this.shadyRoot._insertionPoints;
      for (var i = 0, l = p$.length, p, parent; i < l && (p = p$[i]); i++) {
        parent = p._lightParent || p.parentNode;
        if (!parent._useContent && parent !== this && parent !== this.shadyRoot) {
          this._updateChildNodes(parent, this._composeNode(parent));
        }
      }
    },
    _composeNode: function (node) {
      var children = [];
      var c$ = getLightChildren(node.shadyRoot || node);
      for (var i = 0; i < c$.length; i++) {
        var child = c$[i];
        if (isInsertionPoint(child)) {
          var distributedNodes = child._distributedNodes;
          for (var j = 0; j < distributedNodes.length; j++) {
            var distributedNode = distributedNodes[j];
            if (isFinalDestination(child, distributedNode)) {
              children.push(distributedNode);
            }
          }
        } else {
          children.push(child);
        }
      }
      return children;
    },
    _updateChildNodes: function (container, children) {
      var composed = getComposedChildren(container);
      var splices = Polymer.ArraySplice.calculateSplices(children, composed);
      for (var i = 0, d = 0, s; i < splices.length && (s = splices[i]); i++) {
        for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
          if (getComposedParent(n) === container) {
            remove(n);
          }
          composed.splice(s.index + d, 1);
        }
        d -= s.addedCount;
      }
      for (var i = 0, s, next; i < splices.length && (s = splices[i]); i++) {
        next = composed[s.index];
        for (var j = s.index, n; j < s.index + s.addedCount; j++) {
          n = children[j];
          insertBefore(container, n, next);
          composed.splice(j, 0, n);
        }
      }
      ensureComposedParent(container, children);
    },
    _matchesContentSelect: function (node, contentElement) {
      var select = contentElement.getAttribute('select');
      if (!select) {
        return true;
      }
      select = select.trim();
      if (!select) {
        return true;
      }
      if (!(node instanceof Element)) {
        return false;
      }
      var validSelectors = /^(:not\()?[*.#[a-zA-Z_|]/;
      if (!validSelectors.test(select)) {
        return false;
      }
      return this.elementMatches(select, node);
    },
    _elementAdd: function () {
    },
    _elementRemove: function () {
    }
  });
  var saveLightChildrenIfNeeded = Polymer.DomApi.saveLightChildrenIfNeeded;
  var getLightChildren = Polymer.DomApi.getLightChildren;
  var matchesSelector = Polymer.DomApi.matchesSelector;
  var hasInsertionPoint = Polymer.DomApi.hasInsertionPoint;
  var getComposedChildren = Polymer.DomApi.getComposedChildren;
  var getComposedParent = Polymer.DomApi.getComposedParent;
  var removeFromComposedParent = Polymer.DomApi.removeFromComposedParent;
  function distributeNodeInto(child, insertionPoint) {
    insertionPoint._distributedNodes.push(child);
    var points = child._destinationInsertionPoints;
    if (!points) {
      child._destinationInsertionPoints = [insertionPoint];
    } else {
      points.push(insertionPoint);
    }
  }
  function clearDistributedDestinationInsertionPoints(content) {
    var e$ = content._distributedNodes;
    if (e$) {
      for (var i = 0; i < e$.length; i++) {
        var d = e$[i]._destinationInsertionPoints;
        if (d) {
          d.splice(d.indexOf(content) + 1, d.length);
        }
      }
    }
  }
  function maybeRedistributeParent(content, host) {
    var parent = content._lightParent;
    if (parent && parent.shadyRoot && hasInsertionPoint(parent.shadyRoot) && parent.shadyRoot._distributionClean) {
      parent.shadyRoot._distributionClean = false;
      host.shadyRoot._dirtyRoots.push(parent);
    }
  }
  function isFinalDestination(insertionPoint, node) {
    var points = node._destinationInsertionPoints;
    return points && points[points.length - 1] === insertionPoint;
  }
  function isInsertionPoint(node) {
    return node.localName == 'content';
  }
  var nativeInsertBefore = Element.prototype.insertBefore;
  var nativeRemoveChild = Element.prototype.removeChild;
  function insertBefore(parentNode, newChild, refChild) {
    var newChildParent = getComposedParent(newChild);
    if (newChildParent !== parentNode) {
      removeFromComposedParent(newChildParent, newChild);
    }
    remove(newChild);
    nativeInsertBefore.call(parentNode, newChild, refChild || null);
    newChild._composedParent = parentNode;
  }
  function remove(node) {
    var parentNode = getComposedParent(node);
    if (parentNode) {
      node._composedParent = null;
      nativeRemoveChild.call(parentNode, node);
    }
  }
  function ensureComposedParent(parent, children) {
    for (var i = 0, n; i < children.length; i++) {
      children[i]._composedParent = parent;
    }
  }
  function getTopDistributingHost(host) {
    while (host && hostNeedsRedistribution(host)) {
      host = host.domHost;
    }
    return host;
  }
  function hostNeedsRedistribution(host) {
    var c$ = Polymer.dom(host).children;
    for (var i = 0, c; i < c$.length; i++) {
      c = c$[i];
      if (c.localName === 'content') {
        return host.domHost;
      }
    }
  }
  function notifyContentObservers(root) {
    for (var i = 0, c; i < root._insertionPoints.length; i++) {
      c = root._insertionPoints[i];
      if (hasDomApi(c)) {
        Polymer.dom(c).notifyObserver();
      }
    }
  }
  function notifyInitialDistribution(host) {
    if (hasDomApi(host)) {
      Polymer.dom(host).notifyObserver();
    }
  }
  var needsUpgrade = window.CustomElements && !CustomElements.useNative;
  function upgradeLightChildren(children) {
    if (needsUpgrade && children) {
      for (var i = 0; i < children.length; i++) {
        CustomElements.upgrade(children[i]);
      }
    }
  }
}());
if (Polymer.Settings.useShadow) {
  Polymer.Base._addFeature({
    _poolContent: function () {
    },
    _beginDistribute: function () {
    },
    distributeContent: function () {
    },
    _distributeContent: function () {
    },
    _finishDistribute: function () {
    },
    _createLocalRoot: function () {
      this.createShadowRoot();
      this.shadowRoot.appendChild(this.root);
      this.root = this.shadowRoot;
    }
  });
}
Polymer.DomModule = document.createElement('dom-module');
Polymer.Base._addFeature({
  _registerFeatures: function () {
    this._prepIs();
    this._prepBehaviors();
    this._prepConstructor();
    this._prepTemplate();
    this._prepShady();
    this._prepPropertyInfo();
  },
  _prepBehavior: function (b) {
    this._addHostAttributes(b.hostAttributes);
  },
  _initFeatures: function () {
    this._registerHost();
    if (this._template) {
      this._poolContent();
      this._beginHosting();
      this._stampTemplate();
      this._endHosting();
    }
    this._marshalHostAttributes();
    this._setupDebouncers();
    this._marshalBehaviors();
    this._tryReady();
  },
  _marshalBehavior: function (b) {
  }
});

