var app = angular.module('SyncMailingList', ['ngMaterial']);

Group = function(group) {
  this.id = group.id;
  this.email = group.email;
  this.name = group.name;
this.members = null;
  var request = gapi.client.directory.members.list({
    'groupKey': this.id,
  });
  //reques.execute(angular.bind(this, this.loadAllMembers));
};
Group.prototype.loadAllMembers = function(resp) {
this.members = resp.members;
console.log(resp);
};

SyncMailingListCtrl = function($scope) {
  this.groups = [];
  this.$scope = $scope;
  $scope.loadDirectoryApi = angular.bind(this, this.loadDirectoryApi);
};

SyncMailingListCtrl.prototype.loadDirectoryApi = function() {
  gapi.client.load('admin', 'directory_v1', angular.bind(this, this.loadGroups));
};

SyncMailingListCtrl.prototype.loadGroups = function() {
console.log(gapi.client);
  var request = gapi.client.directory.groups.list({
    'domain': 'ncbctimothy.org',
  });

  request.execute(angular.bind(this, this.loadGroupsResponse));

  this.loadAdressBook();
};

SyncMailingListCtrl.prototype.loadGroupsResponse = function(resp) {
  console.log(resp);
  var users = resp.users;
 
  if (resp.groups && resp.groups.length > 0) {
    for (var i = 0; i < resp.groups.length; ++i) {
      this.groups.push(new Group(resp.groups[i]));
    }
  } else {
    console.log('No Groups found.');
  }
  console.log(this);
  this.$scope.$apply();
};

SyncMailingListCtrl.prototype.loadAdressBook = function() {
	var token = gapi.auth.getToken().access_token;
var urlLocation = 'tIqN7d9096WggJYhJFAofXA';
	var url = 'https://spreadsheets.google.com/feeds/worksheets/' + urlLocation + '/private/full?access_token=' + token;
	console.log(url);
	$.get(url, function(data) {
			console.log(data);
			});

};

app.controller('SyncMailingListCtrl', SyncMailingListCtrl);

