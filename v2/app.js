SaenuriYoungModule = angular.module('SaenuriYoungModule',['ngMaterial', 'ngMessages']);

AddressBookController = function($scope) {
  console.log('Start controller');
console.log(this);
  this.$scope = $scope;
  this.isSignedIn = false;
/*
  isSignedIn = googleService.isSignedIn;
*/
  gapi.load('client:auth2', angular.bind(this, this.initClient));

  this.range = null;
};

AddressBookController.prototype.initClient = function() {
  console.log('initClient');

  var CLIENT_ID = '1031261625328-bti3hb1raq4jd0apfb8e1lu1udgl6a8p.apps.googleusercontent.com';

  // Array of API discovery doc URLs for APIs used by the quickstart
  var DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];

  // Authorization scopes required by the API; multiple scopes can be
  // included, separated by spaces.
  var SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly";

  var Self = this;
  gapi.client.init({
    discoveryDocs: DISCOVERY_DOCS,
    clientId: CLIENT_ID,
    scope: SCOPES
    }).then(angular.bind(this, this.clientInit));
};

AddressBookController.prototype.clientInit = function() {
	console.log(gapi.auth2.getAuthInstance());
	// Listen for sign-in state changes.
	gapi.auth2.getAuthInstance().isSignedIn.listen(angular.bind(this, this.updateSigninStatusCallback));
	this.updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
};

AddressBookController.prototype.updateSigninStatusCallback = function(isSignedIn) {
  console.log('callback');
  this.updateSigninStatus(isSignedIn);
  this.$scope.$apply();
};

AddressBookController.prototype.updateSigninStatus = function(isSignedIn) {
  console.log('Before: ' + this.isSignedIn);
  this.isSignedIn = isSignedIn;
  console.log('After: ' + this.isSignedIn);

  if (this.isSignedIn && !this.range) {
    gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Class Data!A2:E',
    }).then(angular.bind(this, this.handleListMajors));
  }
};

AddressBookController.prototype.handleListMajors = function(response) {
  this.range = response.result;
  this.$scope.$apply();
};

AddressBookController.prototype.handleAuthClick = function(event) {
  console.log('Click signin');
  gapi.auth2.getAuthInstance().signIn();
};
AddressBookController.prototype.handleSignoutClick = function(event) {
    console.log('Click signout');
    gapi.auth2.getAuthInstance().signOut();
};

SaenuriYoungModule.controller('AddressBookController', ['$scope', AddressBookController]);
