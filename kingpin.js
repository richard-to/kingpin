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
        if (route === '/') {
            return 'index';
        }

        var routeParts = route.split(_delim);
        var routeName = '';
        for (var i = 0; i < routeParts.length; ++i) {
            if (routeParts[i] !== '' && routeParts[i][0] !== _tokenPrefix) {
                routeName += '_' + routeParts[i];
            }
        }
        return routeName.substring(1);
    };


    var _self = this;

    var _baseURL = location.protocol + "//" + location.hostname;
    if (location.port !== 80 && location.port !== 443) {
        _baseURL += ":" + location.port;
    }

    var _routerList = [];
    var _routerTable = {};

    var _setRoute = function(pathname) {
        for (var i = 0; i < _routerList.length; ++i) {;
            if (pathname.indexOf(_routerList[i]) !== 0) {
                continue;
            }
            if (_routerTable[_routerList[i]](pathname)) {
                return true;
            }
        }
        return false;
    };

    var _onLinkClick = function(e) {
        var node = e.target;
        while (node.tagName !== 'A' && node.parentNode)  {
            node = node.parentNode;
        }

        if (!node) {
            return;
        }

        if (node.tagName !== 'A') {
            return;
        }

        if (node.href.indexOf(_baseURL) !== 0) {
            return;
        }

        if (_setRoute(node.href.substring(_baseURL.length))) {
            e.preventDefault();
        }
    };

    var _onPopState = function(e) {
        _setRoute(location.pathname);
    };

    var _addToRouterTable = function(basepath, method) {
        if (_routerTable[basepath] !== undefined) {
            throw new Error("Basepath already exists in router table.");
        }
        _routerList.push(basepath);
        _routerTable[basepath] = method;
    };

    if (history.pushState) {
        document.body.addEventListener('click', _onLinkClick.bind(_self));
        window.addEventListener("popstate", _onPopState.bind(_self));
    }


    var Kingpin = function(basepath, routes) {
        if (typeof basepath !== 'string' || basepath[0] !== '/') {
            throw new Error("Basepath must start with forward slash.");
        }

        this.basepath = basepath;
        this.routes = [];
        this.regexRoutes = {};
        this.actions = {};
        this.go = {};
        this.urlFor = {};
        this.route = {};

        if (routes && Array.isArray(routes)) {
            for (var i = 0; i < routes.length; ++i) {
                this.on(routes[i][0], routes[i][1], routes[i][2]);
            }
        } else if (routes) {
            this.on(routes[0], routes[1], routes[2]);
        }

        _addToRouterTable(this.basepath, this.setRoute.bind(this));
    };

    Kingpin.prototype.on = function(route, action, scope) {
        var self = this;
        var routeName = _buildRouteName(route);
        if (this.urlFor[routeName]) {
            return;
        }
        var fullRoute = this.basepath + route;

        this.routes.push(routeName);
        this.route[routeName.toUpperCase()] = route;
        this.urlFor[routeName] = function() {
            return _urlFor(fullRoute, arguments);
        };
        this.actions[routeName] = action;
        this.go[routeName] = function() {
            action.apply(scope, arguments);
            if (history.pushState) {
                history.pushState(null, null, self.urlFor[routeName].apply(self, arguments));
            }
        };
        this.actions[routeName] = action;
        this.regexRoutes[routeName] = new RegExp(_toRegexRoute(fullRoute));

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

    window.Kingpin = Kingpin;
})();