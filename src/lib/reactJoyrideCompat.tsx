"use client";

export type Step = {
  target: string;
  content: any;
  [key: string]: any;
};

export type CallBackProps = {
  status?: string;
  type?: string;
  index?: number;
  [key: string]: any;
};

export const STATUS = {
  FINISHED: "finished",
  SKIPPED: "skipped",
} as const;

export const EVENTS = {
  TARGET_NOT_FOUND: "target:not_found",
  STEP_BEFORE: "step:before",
  STEP_AFTER: "step:after",
} as const;

export default function Joyride(_props: any) {
  return null;
}
