(function () {
  function Monkberry() {
    this.pool = new Pool();
    this.templates = {};
    this.filters = {};
    this.wrappers = {};
  }

  Monkberry.prototype.foreach = function (parent, node, children, template, data) {
    var i, j, len, childrenSize = size(children);

    len = childrenSize - data.length;
    for (i in children) if (children.hasOwnProperty(i)) {
      if (len-- > 0) {
        children[i].remove();
      } else {
        break;
      }
    }

    j = 0;
    for (i in children) if (children.hasOwnProperty(i)) {
      children[i].update(data[j++]);
    }

    for (j = childrenSize, len = data.length; j < len; j++) {
      var view = this.render(template);
      view.parent = parent;
      parent.children.push(view);
      view.appendTo(node);
      view.update(data[j]);
      i = push(children, view);

      var viewRemove = view.remove;
      view.remove = (function (i, viewRemove) {
        return function () {
          viewRemove();
          remove(children, i);
        };
      })(i, viewRemove);
    }
  };

  Monkberry.prototype.iftest = function (parent, node, child/*.ref*/, template, data, test) {
    if (child.ref) {
      if (test) {
        child.ref.update(data);
      }
      else {
        child.ref.remove();
      }
    } else if (test) {
      var view = this.render(template);
      view.parent = parent;
      parent.children.push(view);
      view.appendTo(node);
      view.update(data);
      child.ref = view;

      var viewRemove = view.remove;
      view.remove = function () {
        viewRemove();
        child.ref = null;
      };
    }
  };

  Monkberry.prototype.render = function (name, values, no_cache) {
    no_cache = no_cache || false;

    if (this.templates[name]) {
      var view, self = this;

      if (no_cache) {
        view = this.templates[name]();
      } else {
        view = this.pool.pull(name);
        if (!view) {
          view = this.templates[name]();
        }
      }

      view.parent = null;
      view.children = [];

      view.appendTo = function (toNode) {
        for (var i = 0, len = view.nodes.length; i < len; i++) {
          if (toNode.nodeType == 8) {
            if (toNode.parentNode) {
              toNode.parentNode.insertBefore(view.nodes[i], toNode);
            } else {
              throw new Error("Can not insert child view into parent node." +
              "You need append your view first and then update.");
            }
          } else {
            toNode.appendChild(view.nodes[i]);
          }
        }
      };

      view.getDom = function (toNode) {
        if (view.nodes.length == 1) {
          return view.nodes[0];
        } else {
          var fragment = document.createDocumentFragment();
          for (var i = 0, len = view.nodes.length; i < len; i++) {
            fragment.appendChild(view.nodes[i]);
          }
          return fragment;
        }
      };

      view.remove = function () {
        // Remove appended nodes
        var i = view.nodes.length;
        while (i--) {
          view.nodes[i].parentNode.removeChild(view.nodes[i]);
        }
        // Remove all children views
        i = view.children.length;
        while (i--) {
          view.children[i].remove();
        }
        // Remove this view from parent views children.
        if (view.parent) {
          i = view.parent.children.indexOf(view);
          view.parent.children.splice(i, 1);
        }
        self.pool.push(name, view);
      };

      if (values !== undefined) {
        view.update(values);
      }

      view.wrapped = view.wrapped || {};
      if (this.wrappers[name] && !view.wrapped[name]) {
        view = this.wrappers[name](view);
        view.wrapped[name] = true;
      }

      return view;
    } else {
      throw new Error('Template with name "' + name + '" does not found.');
    }
  };

  Monkberry.prototype.prerender = function (name, times) {
    while (times--) {
      this.pool.push(name, this.render(name, undefined, true));
    }
  };

  Monkberry.prototype.mount = function (templates) {
    var _this = this;
    Object.keys(templates).forEach(function (name) {
      _this.templates[name] = templates[name];
    });
  };

  function Pool() {
    this.store = {};
  }

  Pool.prototype.push = function (name, view) {
    if (!this.store[name]) {
      this.store[name] = [];
    }
    this.store[name].push(view);
  };

  Pool.prototype.pull = function (name) {
    if (this.store[name]) {
      return this.store[name].pop();
    } else {
      return void 0;
    }
  };

  // Helper functions

  function max(map) {
    var maximum = 0;
    for (var i in map) if (map.hasOwnProperty(i)) {
      i = parseInt(i);
      if (i > maximum) {
        maximum = i;
      }
    }
    return parseInt(maximum);
  }

  function push(map, element) {
    var maximum = max(map) + 1;
    map[maximum] = element;
    return maximum;
  }

  function remove(map, i) {
    delete map[i];
  }

  function size(map) {
    var size = 0;
    for (var i in map) if (map.hasOwnProperty(i)) {
      size++;
    }
    return size;
  }

  if (typeof module !== "undefined") {
    module.exports = new Monkberry();
  } else {
    window.monkberry = new Monkberry();
  }
})();
