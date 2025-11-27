// XState machine for Notification lifecycle
// Contract:
//  Inputs: events { type: 'SEND'|'DELIVER'|'READ'|'HIDE'|'UNHIDE'|'DELETE' }
//  Outputs: state changes and side-effects (API calls to persist read/hidden state)

const { createMachine } = require('xstate');

const notificationMachine = createMachine({
  id: 'notification',
  initial: 'created',
  context: { id: null, message: null },
  states: {
    created: {
      on: {
        SEND: 'sent'
      }
    },
    sent: {
      on: {
        DELIVER: 'delivered',
        DELETE: 'deleted'
      }
    },
    delivered: {
      on: {
        READ: 'read',
        HIDE: 'hidden',
        DELETE: 'deleted'
      }
    },
    read: {
      on: {
        HIDE: 'hidden',
        DELETE: 'deleted'
      }
    },
    hidden: {
      on: {
        UNHIDE: 'delivered',
        DELETE: 'deleted'
      }
    },
    deleted: { type: 'final' }
  }
});

module.exports = notificationMachine;
