var app = angular.module('SyncMailingList', ['ngMaterial']);

Group = function(ctrl, group) {
  this.ctrl = ctrl;
  this.id = group.id;
  this.email = group.email;
  this.name = group.name;
  this.members = null;
  this.newMembers = null;
  this.oldMembers = null;
  var request = gapi.client.directory.members.list({
    'groupKey': this.id,
  });
  request.execute(angular.bind(this, this.loadAllMembers));
};
Group.prototype.loadAllMembers = function(resp) {
  this.members = resp.members;
  --this.ctrl.pendingLoadingMembers;
  this.ctrl.$scope.$apply();
};

NewGroup = function(ctrl, email, name) {
  this.ctrl = ctrl;
  this.email = email;
  this.name = name;
  this.members = [];
};

SyncMailingListCtrl = function($scope) {
  this.$scope = $scope;
  this.groups = null;
  this.pendingLoadingMembers = -1;
  this.loadAddressBookDone = false;

  this.login = false;

  $scope.loadDirectoryApi = angular.bind(this, this.loadDirectoryApi);
};

SyncMailingListCtrl.prototype.loadDirectoryApi = function() {
  this.login = true;
  gapi.client.load('admin', 'directory_v1', angular.bind(this, this.loadGroups));
};

SyncMailingListCtrl.prototype.loadGroups = function() {
console.log(gapi.client);
  var request = gapi.client.directory.groups.list({
    'domain': 'ncbctimothy.org',
  });
  request.execute(angular.bind(this, this.loadGroupsResponse));
};

      /**
       * Append a pre element to the body containing the given message
       * as its text node.
       *
       * @param {string} message Text to be placed in pre element.
       */
      function appendPre(message) {
        var pre = document.getElementById('output');
        var textContent = document.createTextNode(message + '\n');
        pre.appendChild(textContent);
      }

SyncMailingListCtrl.prototype.loadGroupsResponse = function(resp) {
  console.log(resp);
  var users = resp.users;
  this.groups = {};
 
  if (resp.groups && resp.groups.length > 0) {
    this.pendingLoadingMembers = resp.groups.length;
    for (var i = 0; i < resp.groups.length; ++i) {
      var group = new Group(this, resp.groups[i]);
      this.groups[group.email] = group;
    }
  } else {
    console.log('No Groups found.');
  }
  this.loadAddressBook();
  this.$scope.$apply();
};

SyncMailingListCtrl.prototype.loadAddressBook = function() {
  var scriptId = "MdvgmFI0BdWx1TRCG4kwb42a2Ez2YjWyM";

  // Create an execution request object.
  var request = {
    //'function': 'getFoldersUnderRoot'
    'function': 'myFunction'

  };

  // Make the API request.
  var op = gapi.client.request({
      'root': 'https://script.googleapis.com',
      'path': 'v1/scripts/' + scriptId + ':run',
      'method': 'POST',
      'body': request
      });

  var ctrl = this;
  op.execute(function(resp) {
    if (resp.error && resp.error.status) {
      // The API encountered a problem before the script
      // started executing.
      appendPre('Error calling API:');
      appendPre(JSON.stringify(resp, null, 2));
    } else if (resp.error) {
      // The API executed, but the script returned an error.

      // Extract the first (and only) set of error details.
      // The values of this object are the script's 'errorMessage' and
      // 'errorType', and an array of stack trace elements.
      var error = resp.error.details[0];
      appendPre('Script error message: ' + error.errorMessage);

      if (error.scriptStackTraceElements) {
        // There may not be a stacktrace if the script didn't start
        // executing.
        appendPre('Script error stacktrace:');
        for (var i = 0; i < error.scriptStackTraceElements.length; i++) {
          var trace = error.scriptStackTraceElements[i];
          appendPre('\t' + trace.function + ':' + trace.lineNumber);
        }
      }
   } else {
     var spreadSheet = resp.response.result;
     console.log(spreadSheet);
     for (var sheetId in spreadSheet) {
       var sheet = spreadSheet[sheetId];
       var fullEmail = sheet.email + '@ncbctimothy.org';
       if (fullEmail in ctrl.groups) {
       } else {
         var group = new NewGroup(ctrl, fullEmail, sheet.name);
         ctrl.groups[fullEmail] = group;
       }
     }
     ctrl.loadAddressBookDone = true;
     ctrl.$scope.$apply();
   }
  });
};

app.controller('SyncMailingListCtrl', SyncMailingListCtrl);

