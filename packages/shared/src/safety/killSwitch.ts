export interface KillSwitchState {
  enabled: boolean;
  reason?: string;
  activatedBy?: string;
  activatedAt?: string;
}

let globalKillSwitchState: KillSwitchState = {
  enabled: false
};

export const KillSwitch = {
  getState(): KillSwitchState {
    return { ...globalKillSwitchState };
  },

  activate(reason = "Emergency system shutdown", activatedBy = "admin"): KillSwitchState {
    globalKillSwitchState = {
      enabled: true,
      reason,
      activatedBy,
      activatedAt: new Date().toISOString()
    };
    return this.getState();
  },

  deactivate(): KillSwitchState {
    globalKillSwitchState = {
      enabled: false
    };
    return this.getState();
  },

  isActivated(): boolean {
    return globalKillSwitchState.enabled;
  }
};
