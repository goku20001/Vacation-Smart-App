const SmartApp = require('@smartthings/smartapp');

const lights = [];
const tvs = [];

const getSelectedDevices = async context => {
  const arr = context.config.devices;

  lights.length = 0;
  tvs.length = 0;

  for(let item of arr){
    const deviceID = item.deviceConfig.deviceId;
    const deviceData = await context.api.devices.get(deviceID);
    const deviceType = deviceData.components[0].categories[0].name;
    if(deviceType === "Light"){
      lights.push(deviceID);
    }
    else if(deviceType === "Television"){
      tvs.push(deviceID);
    }
  }
}

const turnOnDevice = async (context, deviceId) => {
  await context.api.devices.executeCommand(deviceId,
    {
      capability: "switch",
      command: "on"
    }
  );
}

const turnOffDevice = async (context, deviceId) => {
  await context.api.devices.executeCommand(deviceId,
    {
      capability: "switch",
      command: "off"
    }
  );
}

const randomlySwitchLights = async context => {

  //Select a light randomly
  const n = lights.length;
  indx = Math.floor(Math.random() * n);
  const deviceId = lights[indx];
  const status = await context.api.devices.getStatus(deviceId);
  const value = status.components.main.switch.switch.value;

  //Toggle the light switch
  if(value === "off"){
    turnOnDevice(context, deviceId);
  }
  else{
    turnOffDevice(context, deviceId);
  }
}

const extractDayMonthYear = date => {
    let [day, month, year] = date.split('/');
    day = String(day).padStart(2,'0');
    month = String(month).padStart(2,'0');
    return [day, month, year];
}

const extractHourMinute = time => {
    const options = { timeZone: 'Asia/Kolkata', hour12: false };
    let date = new Date(time);
    let hours = date.toLocaleString('en-US', { ...options, hour: '2-digit' });
    let minutes = date.toLocaleString('en-US', { ...options, minute: '2-digit' });
    hours = String(hours).padStart(2,'0');
    minutes = String(minutes).padStart(2,'0');
    return [hours, minutes];
}


/* Define the SmartApp */
const smartApp = new SmartApp()
  .configureI18n({updateFiles: true}) // Enable translations and update translation file when new items are added.
  .enableEventLogging(2) // Logging for testing.
  .appId("my-app-id")
  .permissions([
    "r:devices:*",
    "r:locations:*",
    "x:devices:*"
  ])
  .page('mainPage', (context, page, configData) => {

    page.section('lights', section => {
      section
        .textSetting('startDate')
        .required(true);
      section
        .textSetting('endDate')
        .required(true);
      section
        .timeSetting('startTime')
        .required(true);
      section
        .timeSetting('endTime')
        .required(true);
      section
        .deviceSetting('devices')
        .capabilities(['switch'])
        .permissions('rx')
        .required(true)
        .multiple(true);

    });

    page.section('television', section => {
      section
        .timeSetting('tvOnTime')
        .required(true)
      section
        .timeSetting('tvOffTime')
        .required(true)
    })
  })
  .updated(async (context, updateData) => {
    // Updated defines what code to run when the SmartApp is installed or the settings are updated by the user.

    // Clear any existing configuration.
    await context.api.schedules.delete()
    await context.api.subscriptions.delete();

    console.log('I am inside updated lifecycle event'.yellow);

    await getSelectedDevices(context);

    const startDate = context.config.startDate[0].stringConfig.value;
    let [startDay, startMonth, startYear] = extractDayMonthYear(startDate);
    const cronExpression1 = `01 13 ${startDay} ${startMonth} ? ${startYear}`; // Schedule for midnight

    const endDate = context.config.endDate[0].stringConfig.value;
    let [endDay, endMonth, endYear] = extractDayMonthYear(endDate);
    const cronExpression2 = `59 13 ${endDay} ${endMonth} ? ${endYear}`; // Schedule for just before midnight

    // Schedules
    await context.api.schedules.schedule(
      'scheduleTimings',
      cronExpression1,
      'Asia/Kolkata'
    );

    await context.api.schedules.schedule(
      'deScheduleEverything',
      cronExpression2,
      'Asia/Kolkata'
    );
    
  })

  // For scheduling events at startTime and endTime(during which randomized lights turning on/off occurs and tv on/off time)
  // Triggers at 00:00 AM of the first day of vacation
  .scheduledEventHandler('scheduleTimings', async (context, event) => {
    console.log("I am inside scheduleTimings".yellow);

    const startTime = context.config.startTime[0].stringConfig.value;
    let [startHour, startMinute] = extractHourMinute(startTime)
    const cronExpression1 = `${startMinute} ${startHour} * * ? *`;

    const endTime = context.config.endTime[0].stringConfig.value;
    let [endHour, endMinute] = extractHourMinute(endTime);
    const cronExpression2 = `${endMinute} ${endHour} * * ? *`;

    const tvOnTime = context.config.tvOnTime[0].stringConfig.value;
    [startHour, startMinute] = extractHourMinute(tvOnTime)
    const cronExpression3 = `${startMinute} ${startHour} * * ? *`;

    const tvOffTime = context.config.tvOffTime[0].stringConfig.value;
    [startHour, startMinute] = extractHourMinute(tvOffTime)
    const cronExpression4 = `${startMinute} ${startHour} * * ? *`;


    // Schedules
    await context.api.schedules.schedule(
      'scheduleRandomization',
      cronExpression1,
      'Asia/Kolkata'
    );

    await context.api.schedules.schedule(
      'deScheduleRandomization',
      cronExpression2,
      'Asia/Kolkata'
    );

    await context.api.schedules.schedule(
      'scheduleTvOnTime',
      cronExpression3,
      'Asia/Kolkata'
    );

    await context.api.schedules.schedule(
      'scheduleTvOffTime',
      cronExpression4,
      'Asia/Kolkata'
    );
  })


  // Triggers at 11:59 PM of the last day of vacation
  .scheduledEventHandler('deScheduleEverything', async (context, event) => {
    console.log("I am inside deScheduleEverything".yellow);
    await context.api.schedules.delete();
  })

    // Triggers at startTime every day of the vacation
  .scheduledEventHandler('scheduleRandomization', async (context, event) => {
    console.log("I am inside scheduleRandomization".yellow);
    await context.api.schedules.schedule(
      'randomizedEventScheduler',
      `0/01 * * * ? *`,
      'Asia/Kolkata'
      );
  })

    // Triggers at endTime every day of the vacation
  .scheduledEventHandler('deScheduleRandomization', async (context, event) => {
    console.log("I am inside deScheduleRandomization".yellow);
    await context.api.schedules.delete('randomizedEventScheduler');
  })

  // Triggers every minute in the time interval [startTime, endTime]
  .scheduledEventHandler('randomizedEventScheduler', async (context, event) => {
    console.log("I am inside randomizedEventScheduler".yellow);
    randomlySwitchLights(context);
  })

  // Triggers at tvOnTime every day of the vacation
  .scheduledEventHandler('scheduleTvOnTime', async (context, event) => {
    console.log("I am inside scheduleTvOnTime".yellow);
    turnOnDevice(context, tvs[0]);
  })

  // Triggers at tvOffTime every day of the vacation
  .scheduledEventHandler('scheduleTvOffTime', async (context, event) => {
    console.log("I am inside scheduleTvOffTime".yellow);
    turnOffDevice(context, tvs[0]);
  })


  module.exports = {
    smartApp, 
    turnOnDevice, 
    turnOffDevice, 
    extractDayMonthYear, 
    extractHourMinute
  };