int imod(int a, int b){
   if (b==0) return 0; // compatibility with behavior of float mod
   int t = a%b;
   // branchless conversion from remainder to modulo
   return t + (int(t!=0)&int(((a<0)^^(b<0))))*b;
}
