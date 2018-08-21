import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import _ from 'lodash';

import DatesRangeView from '../../views/DatesRangeView';
import { DAYS_ON_PAGE } from './DayPicker';
import { getUnhandledProps } from '../../lib';
import {
  buildDays,
  getDefaultEnabledDayPositions,
  getDisabledDays,
  isNextPageAvailable,
  isPrevPageAvailable,
} from './sharedFunctions';

function getDaysFromPrevMonth(date, allDays, currentMonthStartPosition) {
  if (currentMonthStartPosition === 0) {
    return [];
  }
  return allDays.slice(0, currentMonthStartPosition);
}

function getDaysFromNextMonth(date, allDays, currentMonthEndPosition) {
  if (currentMonthEndPosition === allDays.length) {
    return [];
  }
  return allDays.slice(currentMonthEndPosition, allDays.length);
}

/** Build moment based on current page and date position on that page. */
function buildMoment(date/*Moment*/, firstOnPage/*number*/, dateToBuildPosition/*number*/) {
  let result;
  if (firstOnPage === 1/* page starts from first day in month */) {
    result = moment({ year: date.year(), month: date.month(), date: firstOnPage });
  } else {
    /* page starts from day in previous month */
    result = moment({ year: date.year(), month: date.month() - 1, date: firstOnPage});
  }
  result.add(dateToBuildPosition, 'day');
  return result;
}

class DatesRangePicker extends React.Component {
  /*
    Note:
      use it like this <DatesRangePicker key={someInputValue} />
      to make react create new instance when input value changes
  */
  constructor(props) {
    super(props);
    this.state = {
      /* moment instance */
      date: props.initializeWith.clone(),
    };
  }

  buildDays() {
    /*
      Return array of dates (strings) like ['31', '1', ...]
      that used to populate calendar's page.
    */
    return buildDays(this.state.date, DAYS_ON_PAGE);
  }

  getActiveDaysPositions() {
    /*
      Return starting and ending positions of dates range that should be displayed as active
      { start: number, end: number }
      (position in array returned by `this.buildDays`).
    */
    const { date } = this.state;
    const {
      start,
      end,
    } = this.props;
    const allDays = this.buildDays();
    const fromCurrentMonthDayPositions = getDefaultEnabledDayPositions(allDays, date);

    const fromPrev = getDaysFromPrevMonth(date, allDays, fromCurrentMonthDayPositions[0]);
    const fromNext = getDaysFromNextMonth(date, allDays, _.last(fromCurrentMonthDayPositions) + 1);
    const fromCurrentMonth = _.range(1, this.state.date.daysInMonth() + 1);

    let startPosition;
    let endPosition;

    if (start && start.isBefore(date, 'month')) {
      startPosition = fromPrev.indexOf(start.date());
      if (startPosition < 0) {
        startPosition = 0; // first day on the page
      }
    } else if (start && start.isSame(date, 'month')) {
      startPosition = fromCurrentMonth.indexOf(start.date()) + fromCurrentMonthDayPositions[0];
    }
    if (end && end.isSame(date, 'month')) {
      endPosition = fromCurrentMonth.indexOf(end.date()) + fromCurrentMonthDayPositions[0];
    } else if (end && end.isAfter(date, 'month')) {
      const _endPosition = fromNext.indexOf(end.date());
      if (_endPosition < 0) {
        endPosition = DAYS_ON_PAGE - 1; // last day on the page
      } else {
        endPosition = _endPosition + _.last(fromCurrentMonthDayPositions) + 1;
      }
    }
    return { start: startPosition, end: endPosition };
  }

  getDisabledDaysPositions() {
    /*
      Return position numbers of dates that should be displayed as disabled
      (position in array returned by `this.buildDays`).
    */
    const {
      maxDate,
      minDate,
    } = this.props;
    return getDisabledDays(undefined, maxDate, minDate, this.state.date, DAYS_ON_PAGE);
  }

  isNextPageAvailable() {
    return isNextPageAvailable(this.state.date, this.props.maxDate);
  }

  isPrevPageAvailable() {
    return isPrevPageAvailable(this.state.date, this.props.minDate);
  }

  getCurrentDate() {
    /* Return currently selected year and month(string) to display in calendar header. */
    return this.state.date.format('MMMM YYYY');
  }

  handleChange = (e, { key }) => {
    // call `onChange` with value: { start: moment, end: moment }
    const {
      start,
      end,
    } = this.props;
    const firstOnPage = parseInt(this.buildDays()[0]);
    if (_.isNil(start) && _.isNil(end)) {
      const range = {
        start: buildMoment(this.state.date, firstOnPage, parseInt(key)),
      };
      _.invoke(this.props, 'onChange', e, { ...this.props, value: range });
    } else if (!_.isNil(start) && _.isNil(end)) {
      const selectedDate = buildMoment(this.state.date, firstOnPage, parseInt(key));
      if (selectedDate.isAfter(start, 'date')) {
        const range = {
          start,
          end: selectedDate,
        };
        _.invoke(this.props, 'onChange', e, { ...this.props, value: range });
      } else {
        _.invoke(this.props, 'onChange', e, { ...this.props, value: {} });
      }
    } else {
      _.invoke(this.props, 'onChange', e, { ...this.props, value: {} });
    }
  }

  switchToNextPage = () => {
    this.setState(({ date }) => {
      const nextDate = date.clone();
      nextDate.add(1, 'month');
      return { date: nextDate };
    });
  }

  switchToPrevPage = () => {
    this.setState(({ date }) => {
      const prevDate = date.clone();
      prevDate.subtract(1, 'month');
      return { date: prevDate };
    });
  }

  render() {
    const rest = getUnhandledProps(DatesRangePicker, this.props);
    return (
      <DatesRangeView
        { ...rest }
        days={this.buildDays()}
        onNextPageBtnClick={this.switchToNextPage}
        onPrevPageBtnClick={this.switchToPrevPage}
        onDayClick={this.handleChange}
        hasPrevPage={this.isPrevPageAvailable()}
        hasNextPage={this.isNextPageAvailable()}
        currentDate={this.getCurrentDate()}
        active={this.getActiveDaysPositions()}
        disabled={this.getDisabledDaysPositions()} />
    );
  }
}

DatesRangePicker.propTypes = {
  /** Called after day is selected. */
  onChange: PropTypes.func.isRequired,
  /** A value for initializing day picker's state. */
  initializeWith: PropTypes.instanceOf(moment).isRequired,
  /** Start of currently selected dates range. */
  start: PropTypes.instanceOf(moment),
  /** End of currently selected dates range. */
  end: PropTypes.instanceOf(moment),
  /** Minimal date that could be selected. */
  minDate: PropTypes.instanceOf(moment),
  /** Maximal date that could be selected. */
  maxDate: PropTypes.instanceOf(moment),
};

export default DatesRangePicker;
