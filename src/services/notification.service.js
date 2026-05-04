import Notification from "../models/notification.model.js";

const createNotification = async ({ user, appointment, title, message, channel = "in_app", sendAt = new Date() }) => {
  return Notification.create({
    user,
    appointment,
    title,
    message,
    channel,
    sendAt
  });
};

const createAppointmentNotifications = async (appointment) => {
  const reminderAt = new Date(appointment.startAt.getTime() - 10 * 60 * 1000);

  await Promise.all([
    createNotification({
      user: appointment.patient,
      appointment: appointment._id,
      title: "Upcoming consultation",
      message: "Your MediHub consultation starts in 10 minutes.",
      sendAt: reminderAt
    }),
    createNotification({
      user: appointment.doctor,
      appointment: appointment._id,
      title: "Upcoming consultation",
      message: "Your MediHub consultation starts in 10 minutes.",
      sendAt: reminderAt
    })
  ]);
};

const createCancellationNotifications = async (appointment, reason) => {
  await Promise.all([
    createNotification({
      user: appointment.patient,
      appointment: appointment._id,
      title: "Consultation cancelled",
      message: `Your consultation was cancelled by the doctor. Reason: ${reason}`
    }),
    createNotification({
      user: appointment.patient,
      appointment: appointment._id,
      title: "Consultation cancelled",
      message: `Your consultation was cancelled by the doctor. Reason: ${reason}`,
      channel: "email"
    }),
    createNotification({
      user: appointment.doctor,
      appointment: appointment._id,
      title: "Consultation cancelled",
      message: `You cancelled a consultation. Reason: ${reason}`
    })
  ]);
};

export { createAppointmentNotifications, createCancellationNotifications, createNotification };
