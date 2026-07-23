"""Central notification rule thresholds, kept independent of individual rules."""


class NotificationRuleConfig:
    HOT_TEMP_C = 35
    COLD_TEMP_C = 15
    RAIN_PROB_THRESHOLD = 0.6
    BIRTHDAY_WINDOW_DAYS = 3
    WEDDING_WINDOW_DAYS = 7
    FESTIVAL_WINDOW_DAYS = 5
    MAX_NOTIFICATIONS = 20
