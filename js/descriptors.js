const TYPE_DESCRIPTOR = [
    [1, "Stanice"],
    [3, "Dopravna D3"],
    [4, "Dopravna D4"],
    [5, "CDP"],
    [8, "Obvod stanice"],
    [9, "Obvod stanice se zastávkou"],
    [11, "Výhybna"],
    [21, "Odbočka"],
    [23, "Odbočka a zastávka"]
]

const CONTROL_TYPE_DESCRIPTOR = [
    [1, "Výpravčí"],
    [10, "Výpravčí vnější služby"],
    [11, "Výpravčí + výpravčí vnější služby"],
    [12, "Pohotovostní výpravčí + výpravčí vnější služby"],
    [13, "Výpravčí + pohotovostní výpravčí"],
    [14, "Výpravčí + výpravčí vnější služby + pohotovostní výpravčí"],
    [15, "Výpravčí + dirigující dispečer/dispečer RB"],
    [2, "Staniční dozorce"],
    [3, "Dirigující dispečer"],
    [31, "Dirigující dispečer vykonávající službu výpravčího"],
    [32, "Dirigující dispečer + výpravčí vnější služby"],
    [33, "Dirigující dispečer + výpravčí + výpravčí vnější služby"],
    [34, "Dirigující dispečer + pohotovostní výpravčí"],
    [35, "Dirigující dispečer + výpravčí + pohotovostní výpravčí"],
    [36, "Dirigující dispečer + výpravčí + výpravčí vnější služby + pohotovostní výpravčí"],
    [37, "Dirigující dispečer + výpravčí + dirigující dispečer/dispečer RB"],
    [38, "Dirigující dispečer vykonávající službu pohotovostního výpravčího"],
    [4, "Traťový dispečer"],
    [5, "Výpravčí DOZ"],
    [51, "Výpravčí DOZ vykonávající službu výpravčího"],
    [52, "Výpravčí DOZ + výpravčí vnější služby"],
    [53, "Výpravčí DOZ + výpravčí + výpravčí vnější služby"],
    [54, "Výpravčí DOZ + pohotovostní výpravčí"],
    [55, "Výpravčí DOZ + výpravčí + pohotovostní výpravčí"],
    [56, "Výpravčí DOZ + výpravčí + výpravčí vnější služby + pohotovostní výpravčí"],
    [57, "Výpravčí DOZ + výpravčí + dirigující dispečer/dispečer RB"],
    [58, "Výpravčí DOZ + dirigující dispečer/dispečer RB vykonávající službu výpravčího + výpravčí vnější služby"],
    [59, "Výpravčí DOZ vykonávající službu výpravčího + výpravčí DOZ"],
    [6, "Pohotovostní výpravčí"],
    [8, "Zaměstnanec CPS"],
    [9, "Neobsazeno"]
]

const CHANNEL_TYPE_DESCRIPTOR = [
    [0, "GSM-R"],
    [1, "TRS"],
    [2, "SIMPLEX"],
    [3, "TEL"],
]