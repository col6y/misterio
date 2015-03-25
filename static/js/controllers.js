'use strict';


// controllers
var app = angular.module('misterio.controllers', []);

app.controller('Feed', ['$scope', '$location', 'User', '$rootScope',
    function Feed($scope, $location, User, $rootScope) {
  $scope.user = function(id) {
    return User.userLookup[id];
  };

  $scope.linkurl = "/";

  $scope.total = 0;
  $scope.offset = 0;
  $scope.limit = 10;
  $scope.get = function() {
    $scope.messages = [];
    $scope.loading = true;
    User.messages.all($scope.offset, $scope.limit)
      .then(function(data) {
      $rootScope.tellFeedListeners();
      $scope.loading = true;
      $scope.messages = [];
      for (var i=0; i<data.data.length; i++) {
        var d = data.data[i];
        if (d.prev && !d.prevobj) {
          User.messages.get(d.prev).then(function (po) {
            this.prevobj = po;
          }.bind(d));
        }
        $scope.messages.push(d);
      }
      $scope.total = data.total;
    });
  };

  $scope.showing = -1;
  $scope.show = function(id) {
    if ($scope.showing == id) {
      $scope.showing = -1;
    } else {
      $scope.showing = id;
    }
  };
  $scope.isshowing = function(id) {
    return $scope.showing == id;
  };

  $scope.finalize = function(id) {
    if (!User.user.access) return;
    User.messages.toggleFinalize(id).then(function() {
      $scope.get();
    });
  };

  $scope.delete = function(id) {
    if (!User.user.access) return;
    if (confirm('Are you sure you wish to delete this message?')) {
      User.messages.remove(id);
      $scope.get();
    }
  };

  $scope.access = function() {
    return User.user.access;
  };

  $scope.canNext = function() {
    return $scope.offset + $scope.limit < $scope.total;
  };
  $scope.canPrev = function() {
    return $scope.offset !== 0;
  };

  $scope.next = function() {
    if ($scope.canNext()) {
      $scope.offset += $scope.limit;
      $scope.get();
    }
  };
  $scope.prev = function() {
    if ($scope.canPrev()) {
      if ($scope.offset < $scope.limit) {
        $scope.offset = 0;
      } else {
        $scope.offset -= $scope.limit;
      }
      $scope.get();
    }
  };

  $scope.get();
}]);

app.controller('Inbox', ['$scope', '$location', 'User',
    function Inbox($scope, $location, User) {
  $scope.user = function(id) {
    return User.userLookup[id];
  };

  $scope.linkurl = "/inbox";

  $scope.total = 0;
  $scope.offset = 0;
  $scope.limit = 10;

  $scope.get = function() {
    $scope.messages = [];
    User.messages.inbox($scope.offset, $scope.limit)
      .then(function(data) {
      $scope.messages = [];
      for (var i=0; i<data.data.length; i++) {
        var d = data.data[i];
        if (d.prev && !d.prevobj) {
          User.messages.get(d.prev).then(function (po) {
            this.prevobj = po;
          }.bind(d));
        }
        $scope.messages.push(d);
      }
      $scope.total = data.total;
    });
  };

  $scope.canNext = function() {
    return $scope.offset + $scope.limit < $scope.total;
  };

  $scope.access = function() {
    return User.user.access;
  };

  $scope.showing = -1;
  $scope.show = function(id) {
    if ($scope.showing == id) {
      $scope.showing = -1;
    } else {
      $scope.showing = id;
    }
  };
  $scope.isshowing = function(id) {
    return $scope.showing == id;
  };

  $scope.finalize = function(id) {
    if (!User.user.access) return;
    User.messages.toggleFinalize(id).then(function() {
      $scope.get();
    });
  };

  $scope.delete = function(id) {
    if (!User.user.access) return;
    if (confirm('Are you sure you wish to delete this message?')) {
      User.messages.remove(id);
      $scope.get();
    }
  };

  $scope.canPrev = function() {
    return $scope.offset !== 0;
  };

  $scope.next = function() {
    if ($scope.canNext()) {
      $scope.offset += $scope.limit;
      $scope.get();
    }
  };
  $scope.prev = function() {
    if ($scope.canPrev()) {
      if ($scope.offset < $scope.limit) {
        $scope.offset = 0;
      } else {
        $scope.offset -= $scope.limit;
      }
      $scope.get();
    }
  };

  $scope.get();
}]);

app.controller('Compose', ['$scope', '$location', '$routeParams', 'User', 'Storage',
    function Compose($scope, $location, $routeParams, User, Storage) {
  $scope.dirty = 0;
  $scope.message = Storage.get('compose') || ($scope.dirty = 0, $scope.message = {
    public: true, finish: false, to: []
  });
  $scope.$watchCollection('message', _.throttle(function(value) {
    Storage.set('compose', value);
    $scope.dirty && ($scope.dirty--);
  }, 100));

  $scope.state = {
    write: true
  };

  $scope.showWrite = function() {
    $scope.state.write = true;
  };

  $scope.showPreview = function() {
    $scope.state.write = false;
  };

  $scope.user = function(cid) {
    return User.userLookup[cid];
  };
  $scope.User = User;

  $scope.select = function(id) {
    var index = $scope.message.to.indexOf(id);
    if (index === -1) {
      $scope.message.to.push(id);
    } else {
      $scope.message.to.splice(index, 1);
    }
  };
  $scope.selected = function(id) {
    return $scope.message.to.indexOf(id) !== -1;
  };
  $scope.toggle_locked = function() {
    $scope.message.public = !$scope.message.public;
  };
  $scope.toggle_finish = function() {
    $scope.message.finish = !$scope.message.finish;
  };

  function gotPrev(prev) {
    $scope.prev = prev;
    $scope.message.to = [prev.from];
  }

  $scope.getPrev = function() {
    $scope.prev = null;
    User.messages.get(id).then(gotPrev, function(err) {
      $scope.prev = false;
    });
  };

  $scope.reset = function() {
    $scope.message = {
      public: true, to: [], finish: false
    };
    $scope.state.write = true;
    $scope.dirty = 0;
    $scope.SendForm.$setPristine();
  };

  $scope.sending = false;

  $scope.submit = function() {
    var msg = $scope.message;
    $scope.sending = true;
    User.messages.send({
      title: msg.title,
      data: msg.data,
      to: msg.to,
      public: msg.public,
      finish: msg.finish,
      prev: parseInt(msg.prev)
    }).then(function(data) {
      $scope.$emit('flash', 'info', 'Enviado!', 'Tu mensaje ha enviado!', {dismissable: true});
      $scope.reset();
      $scope.sending = false;
    }, function() {
      $scope.sending = false;
    });
  };

  var id = $scope.message.prev = $routeParams.id || null;
  if (id) {
    var stash = $scope.stash();
    if (stash && stash.id === id) {
      gotPrev(stash);
    } else {
      $scope.getPrev();
    }
  }
}]);

app.controller('Broadcast', ['$scope', '$location', '$routeParams', 'User',
    function Compose($scope, $location, $routeParams, User) {
  $scope.user = function(cid) {
    return User.userLookup[cid];
  };
  $scope.message = "";

  var delimiter = "====================\n";

  $scope.generate = function() {
    var after = false;
    for (var index in User.others) {
      if (after) { $scope.message += delimiter; }
      after = true;
      var user = User.others[index];
      $scope.message += user.cid + "||| Message title goes here |||\nMessage body for " + user.name + " goes here.\n";
    }
  };

  $scope.submit = function() {
    var msg = $scope.message;
    var parts = msg.split(delimiter);
    var messages = [];
    for (var index in parts) {
      var part = parts[index];
      var sections = part.split("|||");
      if (sections.length != 3) {
        $scope.$emit('flash', 'error', 'Bad format', 'The delimiter ||| was found ' + sections.length + ' times instead of 3 times.', {dismissable: true});
        return;
      }
      var cid = sections[0], title = sections[1], contents = sections[2];
      title = title.replace(/^[ \t\n]+|[ \t\n]+$/g, ""); // Trim string of whitespace.
      contents = contents.replace(/^[ \t\n]+|[ \t\n]+$/g, "");
      messages.push({"title": title, "data": contents, "public": false, "finish": true, "to": [parseInt(cid)]});
    }
    for (var mid in messages) {
      var message = messages[mid];
      var fn = function(data) {
        $scope.$emit('flash', 'info', 'Enviado!', 'Tu mensaje numero ' + this.mid + "/" + messages.length + " ha enviado!", {dismissable: true});
      }.bind({"mid": parseInt(mid) + 1});
      User.messages.send(message).then(fn);
    }
  };
}]);

app.controller('Users', ['$scope', '$location', 'User',
    function Users($scope, $location, User) {
  $scope.state = {editing: -1, adding: false};
  $scope.editUser = null;

  $scope.showCredits = false;

  $scope.User = User;
  $scope.destroying = 0;

  $scope.toggleCredits = function() {
    $scope.showCredits = !$scope.showCredits;
  };

  $scope.destroy = function(n) {
    if (n === "real") {
      if (confirm("Erase all messages?")) {
        User.messages.clear().then(function () {
          $scope.$emit('flash', 'danger', 'Destriudo!', 'The database has been cleared!', {dismissable: true});
        });
      }
    } else {
      $scope.destroying = n;
    }
  };

  // be has been removed.

  // avatars has been removed.

  // move has been removed.

  $scope.access = function() {
    return User.user.access;
  };

  $scope.disabled = function(index, del) {
    var s = $scope.state, u = User.others[index], m = User.user.id;
    return s.adding || ~s.editing || (del && u.cid === m);
  };

  $scope.selectAvatar = function(avatar) {
    $scope.editUser.avatar = avatar;
    if (!$scope.editUser.name) {
      $scope.editUser.name = avatar.replace(/_/g, " ").split(".")[0].split(" ").map(function(f){return f.substr(0, 1).toUpperCase() + f.substr(1).toLowerCase()}).join(" ");
    }
  };

  $scope.add = function() {
    $scope.state.adding = true;
    $scope.editUser = {'access': false, 'email': null};
  };

  $scope.edit = function(index) {
    if (!User.user.access) return;
    var other = User.others[index];
    $scope.state.editing = index;
    $scope.editUser = {};
    for (var key in other) {
      if (key == "email" && other[key] == null) {
        $scope.editUser[key] = "";
      } else {
        $scope.editUser[key] = other[key];
      }
    }
  };

  $scope.reset = function(index) {
    if (!User.user.access) return;
    var user = User.others[index];
    if (confirm('Are you sure you wish to resend the email for ' + user.name + '?')) {
      User.users.reset(user.cid);
    }
  };

  $scope.delete = function(index) {
    if (!User.user.access) return;
    var user = User.others[index];
    if (confirm('Are you sure you wish to delete ' + user.name + '?')) {
      User.users.remove(user.cid);
    }
  };

  $scope.save = function() {
    if (!User.user.access) return;
    if ($scope.state.adding) {
      User.users.add($scope.editUser).then($scope.cancel);
    } else {
      User.users.update($scope.editUser.cid, $scope.editUser).then($scope.commit);
    }
  };

  $scope.commit = function() {
    var other = User.others[$scope.state.editing];
    for (var key in $scope.editUser) {
      other[key] = $scope.editUser[key];
    }
    $scope.cancel();
  };

  $scope.printout = null;

  $scope.inboxPrintout = function() {
    User.inboxes().then(function(data) {
      $scope.printout = data;
    });
  };

  $scope.cancel = function() {
    if (!User.user.access) return;
    $scope.state.adding = false;
    $scope.state.editing = -1;
    $scope.editUser = null;
  };
}]);

app.controller('AddUser', ['$scope', '$location', 'User',
    function AddUser($scope, $location, User) {
  $scope.user = {};
  $scope.submit = function() {
    User.users.add($scope.user).then(function(data) {
      $location.url('/users/' + data.cid);
    });
  };
}]);

app.controller('Profile', ['$scope', '$location', '$routeParams', 'User',
    function Profile($scope, $location, $routeParams, User) {
  var cid = $scope.cid = $routeParams.cid;
  $scope.user = function(id) {
    return User.userLookup[id];
  };

  $scope.linkurl = "/users/" + cid;

  $scope.total = 0;
  $scope.offset = 0;
  $scope.limit = 10;
  $scope.get = function() {
    $scope.messages = [];
    User.messages.profile(cid, $scope.offset, $scope.limit)
      .then(function(data) {
      $scope.messages = [];
      for (var i=0; i<data.data.length; i++) {
        var d = data.data[i];
        if (d.prev && !d.prevobj) {
          User.messages.get(d.prev).then(function (po) {
            this.prevobj = po;
          }.bind(d));
        }
        $scope.messages.push(d);
      }
      $scope.total = data.total;
    });
  };

  $scope.showing = -1;
  $scope.show = function(id) {
    if ($scope.showing == id) {
      $scope.showing = -1;
    } else {
      $scope.showing = id;
    }
  };
  $scope.isshowing = function(id) {
    return $scope.showing == id;
  };

  $scope.finalize = function(id) {
    if (!User.user.access) return;
    User.messages.toggleFinalize(id).then(function() {
      $scope.get();
    });
  };

  $scope.delete = function(id) {
    if (!User.user.access) return;
    if (confirm('Are you sure you wish to delete this message?')) {
      User.messages.remove(id);
      $scope.get();
    }
  };

  $scope.canNext = function() {
    return $scope.offset + $scope.limit < $scope.total;
  };
  $scope.canPrev = function() {
    return $scope.offset !== 0;
  };

  $scope.next = function() {
    if ($scope.canNext()) {
      $scope.offset += $scope.limit;
      $scope.get();
    }
  };
  $scope.prev = function() {
    if ($scope.canPrev()) {
      if ($scope.offset < $scope.limit) {
        $scope.offset = 0;
      } else {
        $scope.offset -= $scope.limit;
      }
      $scope.get();
    }
  };

  $scope.get();
}]);

app.controller('Navbar', ['$scope', '$location', 'User', function Navbar($scope, $location, User) {
  $scope.User = User;
  $scope.access = function() {
    return User.user.access;
  };
  $scope.selectInstance = function(inst) {
    if (confirm("Are you sure that you want to switch to instance " + inst + "?")) {
      User.users.move(User.user.id, inst).then(function (data) {
        User.users.all().then(function(data) {
          $scope.$emit('flash', 'info', 'Movido!', 'Est�s en instancia ' + inst, {dismissable:true});
        });
      });
      $location.path('/users');
    }
  };
  $scope.logout = User.logout;
}]);

app.controller('Flash', ['$scope', '$rootScope',
    function Flash($scope, $rootScope) {
  $scope.flash = [];
  $rootScope.$on('apiError', function(e, status, message) {
    var type;
    if (status >= 400 && status < 500) {
      type = 'App Error!';
    } else if (status >= 500) {
      type = 'Server Error!';
    } else {
      type = 'Network Error!';
      message || (message = 'An unknown error occurred, please check your network connection.');
    }
    flash('danger', type, message, {dismissable: true});
  });
  $rootScope.$on('flash', function(e, type, info, message, options) {
    flash(type, info, message, options);
  });
  $rootScope.$on('$routeChangeSuccess', function() {
    var then = Date.now() - 5000;
    for (var i = 0; i < $scope.flash.length; i++) {
      var elem = $scope.flash[i];
      if (elem.time > then) {
        break;
      }
    }
    if (i >= 1) $scope.flash.splice(0, i);
  });

  $scope.dismiss = function(index) {
    $scope.flash.splice(index, 1);
  };

  function flash(type, info, message, options) {
    options || (options = {});
    var obj = {
      info: info,
      message: message,
      'class': ['alert-' + type],
      dismissable: !!options.dismissable,
      time: Date.now()
    };
    options.dismissable && obj['class'].push('alert-dismissable');
    $scope.flash.push(obj);
  }
}]);