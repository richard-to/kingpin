(function() {
    // Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
    if (!Array.isArray) {
        Array.isArray = function(arg) {
            return Object.prototype.toString.call(arg) === '[object Array]';
        };
    }

    var _delim = '/';
    var _regexDelim = "\\/";
    var _defaultPlaceholder = '(\\w+)';
    var _tokenPrefix = ':';

    var _toRegexRoute = function(route) {
        var modifiedRouteParts = [];
        var routeParts = route.split(_delim);
        for (var i = 0; i < routeParts.length; ++i) {
            if (routeParts[i][0] === _tokenPrefix) {
                modifiedRouteParts.push(_defaultPlaceholder);
            } else if (routeParts[i] !== '') {
                modifiedRouteParts.push(routeParts[i]);
            }
        }
        return "^" + _regexDelim + modifiedRouteParts.join(_regexDelim) + "\\/?$";
    };

    var _urlFor = function(route, params) {
        var routeParts = route.split(_delim);
        var concreteRoute = [];
        var param_index = 0;
        for (var i = 0; i < routeParts.length; ++i) {
            if (routeParts[i][0] === _tokenPrefix) {
                concreteRoute.push(params[param_index++]);
            } else if (routeParts[i] !== '') {
                concreteRoute.push(routeParts[i]);
            }
        }
        return _delim + concreteRoute.join(_delim) + _delim;
    };

    var _buildRouteName = function(route) {
        var routeParts = route.split(_delim);
        var route = '';
        for (var i = 0; i < routeParts.length; ++i) {
            if (routeParts[i] !== '' && routeParts[i][0] !== _tokenPrefix) {
                route += '_' + routeParts[i];
            }
        }
        return route.substring(1);
    };


    var Kingpin = function(routes) {
        this.baseURL = location.protocol + "//" + location.hostname;
        if (location.port !== 80 && location.port !== 443) {
            this.baseURL += ":" + location.port;
        }

        this.routes = [];
        this.regexRoutes = {};
        this.actions = {};
        this.go = {};
        this.urlFor = {};
        this.route = {};

        if (routes) {
            if (Array.isArray(routes)) {
                for (var i = 0; i < routes.length; ++i) {
                    this.on(routes[i][0], routes[i][1], routes[i][2]);
                }
            } else {
                this.on(routes[0], routes[1], routes[2]);
            }
        }
    };

    Kingpin.prototype._onPopState = function(e) {
        this.setRoute(location.pathname);
    };

    Kingpin.prototype._onLinkClick = function(e) {
        var node = e.target;
        while (node.tagName !== 'A' && node.parentNode)  {
            node = node.parentNode;
        }

        if (node && node.tagName === 'A' && node.href.indexOf(this.baseURL) === 0) {
            if (this.setRoute(node.href.substring(this.baseURL.length))) {
                e.preventDefault();
            }
        }
    };

    Kingpin.prototype.on = function(route, action, scope) {
        var self = this;
        var routeName = _buildRouteName(route);

        if (this.route[routeName]) {
            return;
        }

        this.routes.push(routeName);
        this.route[routeName.toUpperCase()] = route;
        this.urlFor[routeName] = function() {
            return _urlFor(route, arguments);
        };
        this.actions[routeName] = action;
        this.go[routeName] = function() {
            action.apply(scope, arguments);
            history.pushState(null, null, self.urlFor[routeName].apply(self, arguments));
        };
        this.actions[routeName] = action;
        this.regexRoutes[routeName] = new RegExp(_toRegexRoute(route));

        return this;
    };

    Kingpin.prototype.setRoute = function(pathname) {
        var numRoutes = this.routes.length;
        for (var i = 0; i < numRoutes; ++i) {
            var routeName = this.routes[i];
            var result = pathname.match(this.regexRoutes[routeName]);
            if (result) {
                result.shift();
                this.go[routeName].apply(this, result);
                return true;
            }
        }
        return false;
    };

    Kingpin.prototype.startListening = function() {
        if (document.body.addEventListener) {
            document.body.addEventListener('click', this._onLinkClick.bind(this));
        }

        if (history.pushState) {
            window.addEventListener("popstate", this._onPopState.bind(this));
        }
        return this;
    };

    Kingpin.prototype.stopListening = function() {
        if (document.body.addEventListener) {
            document.body.removeEventListener('click', this._onLinkClick.bind(this));
        }

        if (history.pushState) {
            window.removeEventListener("popstate", this._onPopState.bind(this));
        }
        return this;
    };

    window.Kingpin = Kingpin;
})();