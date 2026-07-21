// Crisis-ideation detection, shared by the story composer and umbrella notes.
// Broad on purpose: a match only surfaces a caring overlay with the helplines
// and an "I'm safe, continue" path, so catching a false positive costs little,
// but missing a real cry for help costs a lot.
export const CRISIS = /(kill(ing)? myself|\bkms\b|end it all|end my life|(want|wanna|wanted) (to )?(die|be dead|disappear)|(always|really|just) wanted to die|wish i (was|were) (dead|never born)|no (reason to live|point (in )?living)|nothing to live for|don'?t want to (be here|live|exist|wake up|be alive)|better off (dead|without me)|can'?t (go on|do this anymore|take (it|this) anymore)|give up on life|self[-\s]?harm|hurt(ing)? myself|cut(ting)? myself|suicid(e|al)|hopeless)/i

export const CRISIS_MESSAGE =
  "That sounds really heavy right now. Please reach out to someone trained:\n\n988, Suicide Crisis Helpline (call or text)\nKids Help Phone, text CONNECT to 686868"
