AuthServiceModule = angular.module('AuthServiceModule', []);

var AuthServiceBody = function($q) {
  console.log('Start AuthService');
  this.deferred_ = $q.defer();
  this.promise = this.deferred_.promise;
  this.isSignedIn = false;

  var CLIENT_ID = '1031261625328-bti3hb1raq4jd0apfb8e1lu1udgl6a8p.apps.googleusercontent.com';

  // Array of API discovery doc URLs for APIs used by the quickstart
  var DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];

  // Authorization scopes required by the API; multiple scopes can be
  // included, separated by spaces.
  var SCOPES = "https://www.googleapis.com/auth/spreadsheets";

  var Self = this;

  function UpdateSigninStatus(isSignedIn) {
    Self.isSignedIn = isSignedIn;
    console.log('UpdateSigninStatus: ' + isSignedIn);
  }

  function InitClientCallback() {
    console.log('InitClientCallback');
    gapi.auth2.getAuthInstance().isSignedIn.listen(UpdateSigninStatus);
    UpdateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    Self.deferred_.resolve();
  }

  function InitClient() {
    console.log('Initclient');
    gapi.client.init({
      discoveryDocs: DISCOVERY_DOCS,
      clientId: CLIENT_ID,
      scope: SCOPES
      }).then(InitClientCallback);
  }

  gapi.load('client:auth2', InitClient);
};

AuthService = AuthServiceModule.service('AuthService', AuthServiceBody);
