import React from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@dynatrace/strato-components-preview/layouts";

export const Header = () => {
  return (
    <AppHeader>
      <AppHeader.NavItems>
        <AppHeader.AppNavLink as={Link} to="/" />
        <AppHeader.NavItem as={Link} to="/">
          Overview
        </AppHeader.NavItem>
        <AppHeader.NavItem as={Link} to="/pull-requests">
          PRs / MRs
        </AppHeader.NavItem>
        <AppHeader.NavItem as={Link} to="/developers">
          Desenvolvedores
        </AppHeader.NavItem>
      </AppHeader.NavItems>
    </AppHeader>
  );
};
