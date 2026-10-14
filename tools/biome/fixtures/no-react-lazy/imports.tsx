import { lazy } from 'react'; // expect
import { Suspense, useState } from 'react'; // expect
import React, { Suspense as Boundary } from 'react'; // expect
import { lazy as later } from 'react'; // expect
import { useEffect } from 'react';
import { lazy as notReact } from './local.ts';

export const used = [lazy, Suspense, useState, React, Boundary, later, useEffect, notReact];
