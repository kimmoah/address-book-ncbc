GroupAnalysis = function(date) {
  this.date = date;
  this.counter = new AttendenceCounter();
};

MemberDateAnalysis = function(date, member) {
  this.member = member;
  this.date = date;
};

MemberAnalysis = function(name) {
  this.name = name;
  this.attendance = [];
};

GroupAnalysisController = function($scope, $location, $window, $filter, ChartsService) {
  this.$scope = $scope;
  this.$window = $window;
  this.$filter = $filter;
  this.GroupsService = GroupsService;
  // Extract name and sheet id from the query parameters.
  var search = $location.search();
  this.name = search['name'];
  this.reportSpreadSheetId = search['report_sheetid'];
  this.ChartsService = ChartsService;
  console.log(this.ChartsService);

  // Analysis per date.
  this.groupAnalysis = [];

  // Key is the member's name. Value is MemberAnalysis.
  this.memberAnalysisObject = {};
  // MemberAnalysis. For each ordering.
  this.memberAnalysis = [];
  this.loadedAnalysis = 0;

  this.analysisOrder = 'name';

  if (this.name && this.reportSpreadSheetId) {
    gapi.client.sheets.spreadsheets.get({
      spreadsheetId: this.reportSpreadSheetId
    }).then(angular.bind(this, this.handleLoadingReports),
      angular.bind(this, this.handleLoadingReportsiFailure));
  } else {
    this.$mdDialog.show(
        this.$mdDialog.alert()
        .clickOutsideToClose(true)
        .title('Missing Query Parameter')
        .textContent('Either "name" or "report_sheetid" is missing')
        .ariaLabel('Report Page')
        .ok('Oops!')
        );
  }
};

GroupAnalysisController.prototype.handleLoadingReports = function(response) {
  if (!response.result.sheets) {
    return;
  }
  this.loadedAnalysis = 0;
  for (var i = 0; i < response.result.sheets.length; ++i) {
    var sheetTitle = response.result.sheets[i].properties.title;
    var date = Date.parse(sheetTitle);
    if (isNaN(date))
      continue;
    var gridProperties =
      response.result.sheets[i].properties.gridProperties;

    var endColumn = gridProperties.columnCount;
    var range = sheetTitle + '!A1:' +
      ALPHABET.charAt(endColumn - 1) + gridProperties.rowCount;

    var analysis = new GroupAnalysis(date);
    this.groupAnalysis.push(analysis);
    gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: this.reportSpreadSheetId,
      range: range
    }).then(angular.bind(this, this.handleLoadingReport, analysis),
      angular.bind(this, this.handleLoadingReportFailure, analysis));
  }
  this.groupAnalysis.sort(function(a, b) {
    if (a.date > b.date) return 1;
    if (a.date < b.date) return -1;
    return 0;
  });
};

GroupAnalysisController.prototype.back = function() {
  this.$window.history.back();
};

GroupAnalysisController.prototype.handleLoadingReportsiFailure = function(response) {
};

GroupAnalysisController.prototype.handleLoadingReport = function(
    groupAnalysis, response) {
  ++this.loadedAnalysis;
  var memberData = MemberDataFromSheet(response);
  for (var i = 0; i < memberData.length; ++i) {
    var member = memberData[i];
    if (!(member.name in this.memberAnalysisObject)) {
      var newAnalysis = new MemberAnalysis(member.name);
      this.memberAnalysisObject[member.name] = newAnalysis;
      this.memberAnalysis.push(newAnalysis);
    }
    this.memberAnalysisObject[member.name].attendance.push(
        new MemberDateAnalysis(groupAnalysis.date, member));
  }
  groupAnalysis.counter.increment(memberData);
  if (this.loadedAnalysis == this.groupAnalysis.length) {
    if (this.ChartsService.initialized) {
      this.drawCharts();
    } else {
      this.ChartsService.promise.then(angular.bind(this, this.drawCharts));
    }
  }
  this.$scope.$apply();
};

GroupAnalysisController.prototype.handleLoadingReportFailure = function(
    groupAnalysis, response) {
};

GroupAnalysisController.prototype.drawCharts = function() {
  var arrayData = [];
  var dataLegend = ['Date', '전체'];
  var lineColors = ['#1A237E'];
  for (var i = 0; i < MemberData.status.length; ++i) {
    dataLegend.push(MemberData.status[i].text);
    lineColors.push(MemberData.status[i].iconColor);
  }
  arrayData.push(dataLegend);
  var dateFilter = this.$filter('date');
  for (var i = 0; i < this.groupAnalysis.length; ++i) {
    var group = this.groupAnalysis[i];
    var groupData = [];
    groupData.push(dateFilter(group.date, 'yyyy/MM/dd'));
    groupData.push(group.counter.numMembers);
    for (var j = 0; j < group.counter.statusCount.length; ++j) {
      groupData.push(group.counter.statusCount[j]);
    }
    arrayData.push(groupData);
  }
  console.log(arrayData);
  var data = google.visualization.arrayToDataTable(arrayData);
  var options = {
    title: '출석 상황',
    colors: lineColors,
    legend: { position: 'bottom' }};
  var chart = new google.visualization.LineChart(document.getElementById('group_attendance_charts'));
  chart.draw(data, options);
};
