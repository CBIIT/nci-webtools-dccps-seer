export function yesNo(value) {
  return value ? "Yes" : "No";
}

export function getNotificationRows(params) {
  return [
    ["Long-running Job Notification", yesNo(params.sendNotification)],
    ...(params.sendNotification
      ? [
          ["Job Name", params.jobName],
          ["Email", params.email],
        ]
      : []),
  ];
}
