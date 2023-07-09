
// Define mock functions to simulate SmartThings behavior for testing purposes
  
  const mockSmartAppAPI = {
    devices: {
      executeCommand: jest.fn(),
      getStatus: jest.fn(),
    },
    schedules: {
      schedule: jest.fn(),
      delete: jest.fn(),
    },
    subscriptions: {
      delete: jest.fn(),
    },
  };
  
  module.exports = {
    mockSmartAppAPI,
  };
  