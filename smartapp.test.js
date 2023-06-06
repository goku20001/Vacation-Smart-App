const { mockSmartAppAPI } = require('./testConfig');
const { turnOnLight, turnOffLight, extractDayMonthYear, extractHourMinute } = require('./smartapp');


describe('turnOnLight', () => {
  // Test 1
  test('should execute "switch.on" command', async () => {
    // Create a mock context object
    const context = {
      api: mockSmartAppAPI,
    };

    const deviceId = 'device-1';
    await turnOnLight(context, deviceId);

    expect(context.api.devices.executeCommand).toHaveBeenCalledWith(deviceId, {
      capability: 'switch',
      command: 'on',
    });
  });
});


describe('turnOffLight', () => {
  // Test 2
    test('should execute "switch.off" command', async () => {
      // Create a mock context object
      const context = {
        api: mockSmartAppAPI,
      };
  
      const deviceId = 'device-2';
      await turnOffLight(context, deviceId);
  
      expect(context.api.devices.executeCommand).toHaveBeenCalledWith(deviceId, {
        capability: 'switch',
        command: 'off',
      });
    });
  });

  describe('extractDayMonthYear', () => {
    // Test 3
    test('should return day, month, year from given date', () => {
      expect(extractDayMonthYear('06/06/2023')).toStrictEqual(['06','06','2023']);
    })

    // Test 4
    test('should return day, month, year from given date', () => {
      expect(extractDayMonthYear('7/6/2023')).toStrictEqual(['07','06','2023']);
    })
  })

  describe('extractHourMinute', () => {
    // Test 5
    test('should return hours, minutes from given time', () => {
      expect(extractHourMinute('2023-06-05T12:30:00Z')).toStrictEqual(['18','00']);
    })

    // Test 6
    test('should return hours, minutes from given time', () => {
      expect(extractHourMinute('2023-06-05T14:00:00Z')).toStrictEqual(['19','30']);
    })
  })
