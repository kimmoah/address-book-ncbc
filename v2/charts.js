ChartsServiceModule = angular.module('ChartsServiceModule', []);

var ChartsServiceBody = function($q) {
  console.log('Start ChartsService');
  this.initialized = false;
  this.deferred_ = $q.defer();
  this.promise = this.deferred_.promise;

  var Self = this;
  function InitChartsDone() {
    console.log('InitChartsDone');
    Self.initialized = true;
    Self.deferred_.resolve();
  }

  google.charts.load('current', {packages: ['corechart']});
  google.charts.setOnLoadCallback(InitChartsDone);
};

ChartsService = ChartsServiceModule.service('ChartsService', ChartsServiceBody);
