var app = angular.module('SyncMailingList', ['ngMaterial']);

GroupStatus = {
  INITIALIZING: 1,
  SYNCED: 2,
  MODIFIED: 3,
  NEW: 4,
  DELETED: 5
};

Group = function(ctrl, email, name) {
  this.status = GroupStatus.INITIALIZING;
  this.ctrl = ctrl;
  this.id = null;
  this.email = email;
  this.name = name;

  this.groupsMembers = null;
  this.groupMemberEmails = null;
  this.addressBookMembers = null;
};

Group.prototype.setId = function(id) {
  this.id = id;
  var request = gapi.client.directory.members.list({
    'groupKey': this.id,
  });
  request.execute(angular.bind(this, this.loadAllMembers));
};

Group.prototype.loadAllMembers = function(resp) {
  this.groupsMembers = new Set();
  this.groupMemberEmails = new Set();
  for (var index in resp.members) {
    this.groupsMembers.add(resp.members[index]);

    var email = resp.members[index].email.toLowerCase().replace('saenuriyoung.net', 'ncbctimothy.org').trim();
    this.groupMemberEmails.add(email);
  }
  --this.ctrl.pendingLoadingMembers;
  this.ctrl.$scope.$apply();
};

SyncMailingListCtrl = function($scope) {
  this.$scope = $scope;
  this.groups = null;
  this.pendingLoadingMembers = -1;
  this.loadAddressBookDone = false;

  this.login = false;

  this.syncCompletedGroups = -1;

  $scope.loadDirectoryApi = angular.bind(this, this.loadDirectoryApi);
};

SyncMailingListCtrl.prototype.loadDirectoryApi = function() {
  this.login = true;
  gapi.client.load('admin', 'directory_v1', angular.bind(this, this.loadGroups));
};

SyncMailingListCtrl.prototype.loadGroups = function() {
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
  var users = resp.users;
  this.groups = {};
 
  if (resp.groups && resp.groups.length > 0) {
    this.pendingLoadingMembers = resp.groups.length;
    for (var i = 0; i < resp.groups.length; ++i) {
      var group = new Group(this, resp.groups[i].email, resp.groups[i].name);
      group.setId(resp.groups[i].id);
      this.groups[group.email] = group;
    }
  } else {
    console.log('No Groups found.');
  }
  this.loadAddressBook();
  this.$scope.$apply();
};

SyncMailingListCtrl.prototype.syncAddressBook = function() {
  this.syncCompletedGroups = 0;

  for (var groupIndex in this.groups) {
    var group = this.groups[groupIndex];
    if (group.status == GroupStatus.INITIALIZING) {
      console.log(group);
      this.syncCompletedGroup();
    } else if (group.status == GroupStatus.SYNCED) {
      this.syncCompletedGroup();
    } else if (group.status == GroupStatus.MODIFIED) {
      var addressBookMembersSet = new Set();
      for (var addressIndex in group.addressBookMembers) {
        var addressBookMember = group.addressBookMembers[addressIndex];
	addressBookMembersSet.add(addressBookMember.email.toLowerCase().replace('saenuriyoung.net', 'ncbctimothy.org').trim());
      }
 	
      console.log(addressBookMembersSet);
      console.log(group.groupMemberEmails);
      var newMemberIter = addressBookMembersSet.values();
      for (var i = 0; i < addressBookMembersSet.size; ++i) {
        var email = newMemberIter.next().value;
        if (group.groupMemberEmails.has(email)) {
          continue;
        }
        var resource = {
         'email': email,
        };

        var request = gapi.client.directory.members.insert({
          'groupKey': group.email,
          'resource': resource
        });
        request.execute(angular.bind(this, this.syncCompletedGroup));
      }
      oldMemberIter = group.groupMemberEmails.values();
      for (var i = 0; i < group.groupMemberEmails.size; ++i) {
        var email = oldMemberIter.next().value;
        if (addressBookMembersSet.has(email)) {
          continue;
        }
        console.log(email);
        var request = gapi.client.directory.members.delete({
          'groupKey': group.email,
          'memberKey': email
        });
        request.execute(angular.bind(this, this.syncCompletedGroup));
      }
    } else if (group.status == GroupStatus.NEW) {
      var request = gapi.client.directory.groups.insert({
        'email': group.email,
        'name': group.name,
      });
      request.execute(angular.bind(this, this.syncCompletedGroup));
    } else if (group.status == GroupStatus.DELETED) {
      var request = gapi.client.directory.groups.delete({
        'groupKey': group.id,
      });
      request.execute(angular.bind(this, this.syncCompletedGroup));
    }
  }
};

SyncMailingListCtrl.prototype.syncCompletedGroup = function() {
  ++this.syncCompletedGroups;
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
     for (var sheetId in spreadSheet) {
       var sheet = spreadSheet[sheetId];
       var fullEmail = sheet.email + '@ncbctimothy.org';
       if (!(fullEmail in ctrl.groups)) {
         var group = new Group(ctrl, fullEmail, sheet.name);
         ctrl.groups[fullEmail] = group;
       }
       ctrl.groups[fullEmail].addressBookMembers = sheet.members;
     }
     for (var groupIndex in ctrl.groups) {
       var group = ctrl.groups[groupIndex];
       if (group.groupsMembers == null && group.addressBookMembers) {
         group.status = GroupStatus.NEW;
       } else if (group.groupsMembers != null && group.addressBookMembers == null) {
         group.status = GroupStatus.DELETED;
       } else if (group.groupsMembers != null && group.addressBookMembers != null) {
         if (group.groupsMembers.size != group.addressBookMembers.length) {
           group.status = GroupStatus.MODIFIED;
         } else {
           group.status = GroupStatus.SYNCED;
           for (var addressIndex in group.addressBookMembers) {
             var addressBookMember = group.addressBookMembers[addressIndex];
             var email = addressBookMember.email.toLowerCase().replace('saenuriyoung.net', 'ncbctimothy.org').trim();
             if (!group.groupMemberEmails.has(email)) {
               group.status = GroupStatus.MODIFIED;
             }
           }
         }
       }
     }
     ctrl.loadAddressBookDone = true;
     ctrl.$scope.$apply();
   }
  });
};

app.controller('SyncMailingListCtrl', SyncMailingListCtrl);

