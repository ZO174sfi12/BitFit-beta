// BITFIT BETA // WIDGET
const STATS_URL = "https://ZO174sfi12.github.io/BitFit-beta/stats.json";
const DASHBOARD_URL = "https://ZO174sfi12.github.io/BitFit-beta/";

let stats;
try {
  const req = new Request(STATS_URL);
  req.timeoutInterval = 10;
  stats = await req.loadJSON();
} catch(e) { stats = null; }

const w = new ListWidget();
w.url = DASHBOARD_URL;
w.setPadding(12, 14, 12, 14);

const bg = new LinearGradient();
bg.colors = [new Color("#08080f"), new Color("#0d0d18")];
bg.locations = [0, 1];
bg.startPoint = new Point(0, 0);
bg.endPoint = new Point(1, 1);
w.backgroundGradient = bg;

if (!stats) {
  const err = w.addText("Kan data niet laden");
  err.textColor = new Color("#ff3d6b");
  err.font = Font.systemFont(12);
} else {
  // HEADER
  const header = w.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();

  const bit = header.addText("BIT");
  bit.textColor = new Color("#7b5cff");
  bit.font = Font.boldSystemFont(13);
  const fit = header.addText("FIT");
  fit.textColor = new Color("#00e5ff");
  fit.font = Font.boldSystemFont(13);
  header.addSpacer(6);
  const phaseEl = header.addText(stats.phase);
  phaseEl.textColor = new Color("#00e5ff");
  phaseEl.font = Font.boldSystemFont(9);
  header.addSpacer();
  const dateEl = header.addText(stats.updated.slice(5).replace("-", "/"));
  dateEl.textColor = new Color("#454560");
  dateEl.font = Font.systemFont(9);

  w.addSpacer(10);

  // ROW 1: 5 lifts evenly spaced
  const LIFTS = [
    {label:"SQ",  data: stats.squat,    color:"#b388ff", muscle:"Benen"},
    {label:"DL",  data: stats.deadlift, color:"#ffd600", muscle:"Rug"},
    {label:"BP",  data: stats.bench,    color:"#64b5f6", muscle:"Borst"},
    {label:"OHP", data: stats.ohp,      color:"#00ffb3", muscle:"Schouders"},
    {label:"DIP", data: stats.dip,      color:"#f48fb1", muscle:"Triceps"},
  ];

  const liftRow = w.addStack();
  liftRow.layoutHorizontally();

  LIFTS.forEach((lift, i) => {
    liftRow.addSpacer();

    const cell = liftRow.addStack();
    cell.layoutVertically();
    cell.centerAlignContent();

    // Label
    const lbl = cell.addText(lift.label);
    lbl.textColor = new Color("#454560");
    lbl.font = Font.boldSystemFont(7);
    lbl.centerAlignText();
    cell.addSpacer(2);

    // Weight
    const wt = lift.data ? lift.data.weight + "kg" : "-";
    const wtEl = cell.addText(wt);
    wtEl.textColor = new Color(lift.color);
    wtEl.font = Font.boldSystemFont(15);
    wtEl.centerAlignText();
    cell.addSpacer(2);

    // Rest days
    const restInfo = stats.muscle_rest && stats.muscle_rest[lift.muscle];
    const rd = restInfo ? restInfo.rest : null;
    const rdColor = rd === null ? "#454560" : rd <= 1 ? "#00ffb3" : rd <= 2 ? "#ffd600" : "#ff3d6b";
    const rdEl = cell.addText(rd !== null ? rd + "d" : "-");
    rdEl.textColor = new Color(rdColor);
    rdEl.font = Font.boldSystemFont(10);
    rdEl.centerAlignText();

    if (i < LIFTS.length - 1) {
      liftRow.addSpacer();
      const sep = liftRow.addStack();
      sep.backgroundColor = new Color("#1c1c2a");
      sep.size = new Size(1, 44);
    }
  });

  liftRow.addSpacer();

  w.addSpacer(10);

  // Separator
  const midSep = w.addStack();
  midSep.backgroundColor = new Color("#1c1c30");
  midSep.size = new Size(0, 1);

  w.addSpacer(10);

  // ROW 2: bodyweight + activity dots
  const bottomRow = w.addStack();
  bottomRow.layoutHorizontally();
  bottomRow.spacing = 12;

  // Bodyweight
  const bwBlock = bottomRow.addStack();
  bwBlock.layoutVertically();

  const bwLbl = bwBlock.addText("GEWICHT");
  bwLbl.textColor = new Color("#454560");
  bwLbl.font = Font.boldSystemFont(7);
  bwBlock.addSpacer(2);

  const bwVal = bwBlock.addText(stats.bodyweight.current + " kg");
  bwVal.textColor = Color.white();
  bwVal.font = Font.boldSystemFont(18);
  bwBlock.addSpacer(1);

  const delta = stats.bodyweight.delta_10d;
  const deltaLabel = stats.bodyweight.delta_label || ((delta >= 0 ? '+' : '') + delta + " (10d)");
  const dEl = bwBlock.addText(deltaLabel);
  dEl.textColor = delta <= 0 ? new Color("#00ffb3") : new Color("#ff3d6b");
  dEl.font = Font.boldSystemFont(9);

  // Divider
  const div = bottomRow.addStack();
  div.backgroundColor = new Color("#1c1c30");
  div.size = new Size(1, 46);

  // Activity dots
  const gymBlock = bottomRow.addStack();
  gymBlock.layoutVertically();

  const gymLbl = gymBlock.addText("ACTIVITEIT 10D");
  gymLbl.textColor = new Color("#454560");
  gymLbl.font = Font.boldSystemFont(7);
  gymBlock.addSpacer(4);

  const dotsRow = gymBlock.addStack();
  dotsRow.layoutHorizontally();
  dotsRow.spacing = 4;

  const days = stats.days_10d || [];
  for (let i = 0; i < 10; i++) {
    const on = days[i] === true;
    const dot = dotsRow.addText(on ? "*" : ".");
    dot.textColor = on ? new Color("#7b5cff") : new Color("#1c1c30");
    dot.font = on ? Font.boldSystemFont(13) : Font.systemFont(13);
  }

  gymBlock.addSpacer(2);
  const cntEl = gymBlock.addText(stats.gym_days_10d + " van 10");
  cntEl.textColor = new Color("#7b5cff");
  cntEl.font = Font.boldSystemFont(9);
}

Script.setWidget(w);
if (config.runsInApp) await w.presentMedium();
Script.complete();
