#!/usr/bin/python
# -*- coding: utf-8 -*-

from collections import defaultdict
from datetime import datetime

import birthday
import operator
import util

class ThisMonthBirthday(birthday.BirthdayCallback):
  def start(self):
    self.this_month = datetime.now().month
    self.next_month = self.this_month + 1
    if self.next_month is 13:
      self.next_month = 1
    print 'This month: %d, next month: %d' % (self.this_month, self.next_month)

    self.this_month_birthday = {}
    self.next_month_birthday = {}

    self.birthday_error = defaultdict(list)

  def end(self):
    sorted_this_month_birthday = sorted(self.this_month_birthday.iteritems(),
                                        key=operator.itemgetter(1))
    print ('\nBirthday of this month')
    for item in sorted_this_month_birthday:
      print '  %s : %s' % (item[0], item[1])

    sorted_next_month_birthday = sorted(self.next_month_birthday.iteritems(),
                                        key=operator.itemgetter(1))
    print ('\nBirthday of next month')
    for item in sorted_next_month_birthday:
      print '  %s : %s' % (item[0], item[1])

    print ('\nBirthday errors')
    for mokjang_error in self.birthday_error.items():
      print '  ', mokjang_error[0]
      for error_message in mokjang_error[1]:
        print '    ', error_message
  

  def found_birthday(self, name, mokjang, dt):
    if dt.month is self.this_month:
        self.this_month_birthday[name] = dt.strftime('%m/%d/%Y')
    elif dt.month is self.next_month:
        self.next_month_birthday[name] = dt.strftime('%m/%d/%Y')

  def no_birthday(self, name, mokjang):
    utf8_name = name.encode('utf8')
    self.birthday_error[mokjang].append('No birthday for %s' % utf8_name)

  def invalid_birthday(self, name, mokjang, date_string):
    utf8_name = name.encode('utf8')
    self.birthday_error[mokjang].append(
            'Invalid birthday for %s : %s' % (utf8_name, date_string))

def main():
  user, pw = util.get_userid_and_password('gmail.com')
        
  sheet = birthday.NCBCTimothyAddressSpreadsheet(user, pw)
  this_month = ThisMonthBirthday()
  sheet.CheckSpreadsheetAddress(this_month)


if __name__ == '__main__':
  main()
