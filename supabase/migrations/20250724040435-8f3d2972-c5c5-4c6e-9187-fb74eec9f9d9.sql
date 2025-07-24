-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = auth.uid() 
    AND type = 'admin'
  );
$$;

-- Create policy to allow admins to update connections
CREATE POLICY "Admins can update connections" 
ON public.connections 
FOR UPDATE 
USING (public.is_user_admin());