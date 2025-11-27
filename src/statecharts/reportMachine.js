// Lightweight XState machine for report lifecycle
// Usage: `import { createMachine } from "xstate"` and use this definition in frontend/admin tools
// Note: xstate is not required by the repo; install with `npm i xstate` if you want to run this.

/**
 * Contract:
 *  Inputs: events { type: 'REVIEW' | 'RESOLVE' | 'REOPEN' | 'DELETE' }
 *  Outputs: guarded transitions, actions that call server endpoints (placeholders)
 *  Error modes: server failures on save -> send 'ERROR' event
 */

const { createMachine, assign } = require('xstate');

const reportMachine = createMachine({
  id: 'report',
  initial: 'pending',
  context: {
    reportId: null,
    lastError: null
  },
  states: {
    pending: {
      on: {
        REVIEW: 'reviewed',
        RESOLVE: {
          target: 'resolved',
          actions: ['setResolvedAt', 'notifyReporter']
        },
        DELETE: 'deleted'
      }
    },
    reviewed: {
      on: {
        RESOLVE: {
          target: 'resolved',
          actions: ['setResolvedAt', 'notifyReporter']
        },
        REOPEN: 'pending',
        DELETE: 'deleted'
      }
    },
    resolved: {
      on: {
        REOPEN: 'pending',
        DELETE: 'deleted'
      }
    },
    deleted: {
      type: 'final'
    }
  }
}, {
  actions: {
    setResolvedAt: (ctx, evt) => {
      // placeholder: call backend API to set resolvedAt if needed
      // e.g. fetch(`/api/admin/reports/${ctx.reportId}/status`, { method: 'POST', body: { status: 'resolved' } })
    },
    notifyReporter: (ctx, evt) => {
      // placeholder: create a Notification for the reporter
    }
  }
});

module.exports = reportMachine;
