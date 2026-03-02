export type AdminStep =
  | 'idle'
  // Post steps
  | 'post:text'
  // Photo post
  | 'photopost:photo'
  | 'photopost:caption'
  // Button post
  | 'buttonpost:photo'
  | 'buttonpost:text'
  | 'buttonpost:buttons' // collecting JSON
  // Event
  | 'event:title'
  | 'event:description'
  | 'event:location'
  | 'event:date'
  | 'event:photo'
  // Poll
  | 'poll:question'
  | 'poll:options'
  | 'poll:anonymous'
  | 'poll:closes';

export interface SessionData {
  step: AdminStep;
  draft: Record<string, unknown>;
}

export function initialSession(): SessionData {
  return { step: 'idle', draft: {} };
}
