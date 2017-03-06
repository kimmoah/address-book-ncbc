MemberStatus = function(text, iconColor, materialIconClass, svgSrc) {
  this.text = text;
  this.iconColor = iconColor;
  this.materialIconClass = materialIconClass;
  this.svgSrc = svgSrc;
};

MemberData = function(name) {
  this.name = name;
  this.status = 0;
  this.prayer = '';
  this.note = '';
};

MemberData.status = [
  new MemberStatus('잘 모름', '#212121', 'help', ''),
  new MemberStatus('모두 참석하지 않음', '#B71C1C', 'cancel', ''),
  new MemberStatus('예배만 참석', '#00E676', '', 'church.svg'),
  new MemberStatus('목장만 참석', '#FFEB3B', 'people', ''),
  new MemberStatus('예배 및 목장 참석', '#0091EA', 'thumb_up', '')
];

MemberData.prototype.materialIconClass = function() {
  return MemberData.status[this.status].materialIconClass;
};

MemberData.prototype.svgSrc = function() {
  return MemberData.status[this.status].svgSrc;
};

MemberData.prototype.statusIconColor = function(targetStatus) {
  if (this.status != targetStatus) {
    return {'color': '#9e9e9e'};
  } else {
    return {'color': MemberData.status[this.status].iconColor};
  }
};

MemberData.prototype.getReportArray = function() {
  var ret = [];
  ret.push(this.name);
  ret.push(MemberData.status[this.status].text);
  ret.push(this.prayer);
  ret.push(this.note);

  return ret;
};

AttendenceCounter = function() {
  this.numMembers = 0;
  this.memberStatus = MemberData.status;
  // Initialize counter per status.
  this.statusCount = [];
  for (var i = 0; i < MemberData.status.length; ++i) {
    this.statusCount.push(0);
  }
};
AttendenceCounter.prototype.increment = function(members) {
  this.numMembers += members.length;
  for (var i = 0; i < members.length; ++i) {
    ++this.statusCount[members[i].status];
  }
};

// Member data from the report.
function MemberDataFromSheet(response) {
  var members = [];
  if (!response.result.values) {
    return members;
  }

  // The first row is the title and the second row is the group note.
  for (var i = 2; i < response.result.values.length; ++i) {
    var memberData = new MemberData(response.result.values[i][0]);
    memberData.prayer = response.result.values[i][2];
    memberData.note = response.result.values[i][3];
    for (var j = 0; j < MemberData.status.length; ++j) {
      if (MemberData.status[j].text == response.result.values[i][1]) {
        memberData.status = j;
        break;
      }
    }
    members.push(memberData);
  }
  return members;
}
